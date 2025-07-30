
import React from 'react';

interface SchemaUpdateGuideProps {
  onRetry: () => void;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-surface-main rounded-md p-4 relative font-mono text-sm text-gray-300 max-h-96 overflow-y-auto">
      <pre><code>{code}</code></pre>
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
        aria-label="Copy code to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

const SchemaUpdateGuide: React.FC<SchemaUpdateGuideProps> = ({ onRetry }) => {
  
  const setupSQL = `
-- Danum POS - Database Migration Script v11 to v12 (Intermediary Products)
-- This non-destructive script updates your schema to support multi-level recipes.

-- Section 1: Modify recipe table to support products as ingredients
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_ingredients') THEN
        ALTER TABLE public.product_ingredients RENAME TO product_recipe_items;
        ALTER TABLE public.product_recipe_items RENAME CONSTRAINT product_ingredients_pkey TO product_recipe_items_pkey;
        ALTER TABLE public.product_recipe_items DROP CONSTRAINT product_recipe_items_pkey;
        ALTER TABLE public.product_recipe_items ADD COLUMN id BIGSERIAL PRIMARY KEY;
        ALTER TABLE public.product_recipe_items ADD COLUMN sub_product_id BIGINT NULL REFERENCES public.products(id) ON DELETE CASCADE;
        ALTER TABLE public.product_recipe_items ALTER COLUMN ingredient_id DROP NOT NULL;
        ALTER TABLE public.product_recipe_items ADD CONSTRAINT one_recipe_item_type_check CHECK ((ingredient_id IS NOT NULL AND sub_product_id IS NULL) OR (ingredient_id IS NULL AND sub_product_id IS NOT NULL));
        ALTER TABLE public.product_recipe_items ADD CONSTRAINT unique_ingredient_per_product UNIQUE (product_id, ingredient_id);
        ALTER TABLE public.product_recipe_items ADD CONSTRAINT unique_subproduct_per_product UNIQUE (product_id, sub_product_id);
    END IF;
END;
$$;


-- Section 2: Update database functions to handle the new structure
DROP FUNCTION IF EXISTS public.get_products_with_categories();
CREATE OR REPLACE FUNCTION public.get_products_with_categories()
RETURNS TABLE(id bigint, name text, price numeric, image_url text, categories text[], recipe jsonb)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id, p.name, p.price, p.image_url,
    COALESCE((SELECT array_agg(c.name) FROM public.product_categories pc JOIN public.categories c ON pc.category_id = c.id WHERE pc.product_id = p.id), '{}'::text[]) as categories,
    COALESCE(
      (SELECT jsonb_agg(
        CASE
          WHEN pri.ingredient_id IS NOT NULL THEN
            jsonb_build_object(
              'type', 'ingredient',
              'ingredientId', pri.ingredient_id,
              'ingredientName', i.name,
              'quantity', pri.quantity,
              'unit', pri.unit
            )
          WHEN pri.sub_product_id IS NOT NULL THEN
            jsonb_build_object(
              'type', 'product',
              'productId', pri.sub_product_id,
              'productName', sub_p.name,
              'quantity', pri.quantity,
              'unit', pri.unit
            )
        END
      )
      FROM public.product_recipe_items pri
      LEFT JOIN public.ingredients i ON pri.ingredient_id = i.id
      LEFT JOIN public.products sub_p ON pri.sub_product_id = sub_p.id
      WHERE pri.product_id = p.id),
      '[]'::jsonb
    ) as recipe
  FROM public.products p ORDER BY p.name;
$$;

DROP FUNCTION IF EXISTS public.set_product_recipe(bigint, jsonb);
CREATE OR REPLACE FUNCTION public.set_product_recipe(p_product_id bigint, p_recipe jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    recipe_item jsonb;
    v_ingredient_id bigint;
    v_sub_product_id bigint;
BEGIN
    DELETE FROM public.product_recipe_items WHERE product_id = p_product_id;
    IF jsonb_array_length(p_recipe) > 0 THEN
        FOR recipe_item IN SELECT * FROM jsonb_array_elements(p_recipe) LOOP
            v_ingredient_id := (recipe_item->>'ingredientId')::bigint;
            v_sub_product_id := (recipe_item->>'productId')::bigint;
            INSERT INTO public.product_recipe_items (product_id, ingredient_id, sub_product_id, quantity, unit)
            VALUES (p_product_id, v_ingredient_id, v_sub_product_id, (recipe_item->>'quantity')::numeric, recipe_item->>'unit');
        END LOOP;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.create_order(numeric, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.create_order(p_total numeric, p_items jsonb, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order_id uuid;
    order_item jsonb;
    final_deductions RECORD;
    v_stock_unit text;
    v_conversion_factor numeric;
    v_deduction_amount numeric;
BEGIN
    INSERT INTO public.orders (total, user_id) VALUES (p_total, p_user_id) RETURNING id INTO v_order_id;
    FOR order_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, (order_item->>'product_id')::bigint, (order_item->>'quantity')::integer, (order_item->>'price')::numeric);
    END LOOP;
    FOR final_deductions IN
        WITH RECURSIVE bill_of_materials AS (
            SELECT
                (p_items_json->>'product_id')::bigint as root_product_id,
                pri.sub_product_id,
                pri.ingredient_id,
                (p_items_json->>'quantity')::numeric * pri.quantity as total_quantity,
                pri.unit,
                1 as level
            FROM jsonb_array_elements(p_items) AS p_items_json
            JOIN public.product_recipe_items AS pri ON pri.product_id = (p_items_json->>'product_id')::bigint
            UNION ALL
            SELECT
                bom.root_product_id,
                pri.sub_product_id,
                pri.ingredient_id,
                bom.total_quantity * pri.quantity as total_quantity,
                pri.unit,
                bom.level + 1
            FROM bill_of_materials bom
            JOIN public.product_recipe_items pri ON pri.product_id = bom.sub_product_id
            WHERE bom.sub_product_id IS NOT NULL AND bom.level < 10
        )
        SELECT
            bom.ingredient_id,
            bom.unit,
            SUM(bom.total_quantity) as quantity_to_deduct
        FROM bill_of_materials bom
        WHERE bom.ingredient_id IS NOT NULL
        GROUP BY bom.ingredient_id, bom.unit
    LOOP
        SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = final_deductions.ingredient_id;
        v_conversion_factor := public.get_conversion_factor(final_deductions.unit, v_stock_unit, final_deductions.ingredient_id);
        v_deduction_amount := final_deductions.quantity_to_deduct * v_conversion_factor;
        UPDATE public.ingredients SET stock_level = stock_level - v_deduction_amount WHERE id = final_deductions.ingredient_id;
    END LOOP;
END;
$$;


-- Section 3: Schema Versioning
INSERT INTO public.schema_migrations (version) VALUES (12) ON CONFLICT (version) DO UPDATE SET migrated_at = now();
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs to be updated to v12 for multi-level recipe support.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe, non-destructive operation.</strong> The script below will not delete any of your existing data. It just updates tables and functions.
                </li>
                <li>
                    <strong>Copy the SQL script</strong> provided below. This script is idempotent, meaning it's safe to run multiple times.
                </li>
                <li>
                    <strong>Open the Supabase SQL Editor</strong> for your project by clicking the link below.
                </li>
                <li>
                    <strong>Paste the script and click "Run"</strong>. Wait for it to complete successfully.
                </li>
                <li>
                    After the script executes, return here and click the <strong>"Try Again"</strong> button.
                </li>
            </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (v11 to v12)</h2>
          <CodeBlock code={setupSQL} />
        </div>
         <a 
              href={supabaseSqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full text-center px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
          >
              Go to Supabase SQL Editor
          </a>
      </div>
      <div className="text-center mt-8">
        <button
          onClick={onRetry}
          className="w-full max-w-xs py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300"
        >
          I've run the script, Try Again
        </button>
      </div>
    </div>
  );
};

export default SchemaUpdateGuide;
