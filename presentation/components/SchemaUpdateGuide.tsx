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
-- Danum POS - Database Migration Script to v14 (Restock Logic)
-- This non-destructive script updates your schema to support automatic ingredient deduction when restocking preparations.

-- Section 1: Add new columns to the products table (if not already present from v13)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_level NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_unit TEXT;

-- Section 2: Update database functions to handle new logic

-- Ensure get_products_with_categories is up-to-date
DROP FUNCTION IF EXISTS public.get_products_with_categories();
CREATE OR REPLACE FUNCTION public.get_products_with_categories()
RETURNS TABLE(id bigint, name text, price numeric, image_url text, categories text[], recipe jsonb, is_for_sale boolean, stock_level numeric, stock_unit text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id, p.name, p.price, p.image_url,
    COALESCE((SELECT array_agg(c.name) FROM public.product_categories pc JOIN public.categories c ON pc.category_id = c.id WHERE pc.product_id = p.id), '{}'::text[]) as categories,
    COALESCE(
      (SELECT jsonb_agg(
        CASE
          WHEN pri.ingredient_id IS NOT NULL THEN
            jsonb_build_object( 'type', 'ingredient', 'ingredientId', pri.ingredient_id, 'ingredientName', i.name, 'quantity', pri.quantity, 'unit', pri.unit )
          WHEN pri.sub_product_id IS NOT NULL THEN
            jsonb_build_object( 'type', 'product', 'productId', pri.sub_product_id, 'productName', sub_p.name, 'quantity', pri.quantity, 'unit', pri.unit )
        END
      )
      FROM public.product_recipe_items pri
      LEFT JOIN public.ingredients i ON pri.ingredient_id = i.id
      LEFT JOIN public.products sub_p ON pri.sub_product_id = sub_p.id
      WHERE pri.product_id = p.id),
      '[]'::jsonb
    ) as recipe,
    p.is_for_sale,
    p.stock_level,
    p.stock_unit
  FROM public.products p ORDER BY p.name;
$$;

-- Ensure create_order is up-to-date
DROP FUNCTION IF EXISTS public.create_order(numeric, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.create_order(p_total numeric, p_items jsonb, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order_id uuid; order_item jsonb; v_product_deduction RECORD; v_ingredient_deduction RECORD;
    v_conversion_factor numeric; v_deduction_amount numeric; v_stock_unit text;
BEGIN
    INSERT INTO public.orders (total, user_id) VALUES (p_total, p_user_id) RETURNING id INTO v_order_id;
    FOR order_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, (order_item->>'product_id')::bigint, (order_item->>'quantity')::integer, (order_item->>'price')::numeric);
    END LOOP;
    FOR v_product_deduction IN
        WITH RECURSIVE bom(product_id, quantity, level) AS (
            SELECT (item->>'product_id')::bigint, (item->>'quantity')::numeric, 0 FROM jsonb_array_elements(p_items) as item
            UNION ALL
            SELECT pri.sub_product_id, bom.quantity * pri.quantity, bom.level + 1
            FROM bom JOIN public.products p ON p.id = bom.product_id JOIN public.product_recipe_items pri ON pri.product_id = p.id
            WHERE p.stock_level IS NULL AND pri.sub_product_id IS NOT NULL AND bom.level < 10
        )
        SELECT b.product_id, SUM(b.quantity) as total_quantity FROM bom b JOIN public.products p ON p.id = b.product_id WHERE p.stock_level IS NOT NULL GROUP BY b.product_id
    LOOP
        UPDATE public.products SET stock_level = stock_level - v_product_deduction.total_quantity WHERE id = v_product_deduction.product_id;
    END LOOP;
    FOR v_ingredient_deduction IN
        WITH RECURSIVE bom(product_id, quantity, level) AS (
            SELECT (item->>'product_id')::bigint, (item->>'quantity')::numeric, 0 FROM jsonb_array_elements(p_items) as item
            UNION ALL
            SELECT pri.sub_product_id, bom.quantity * pri.quantity, bom.level + 1
            FROM bom JOIN public.products p ON p.id = bom.product_id JOIN public.product_recipe_items pri ON pri.product_id = p.id
            WHERE p.stock_level IS NULL AND pri.sub_product_id IS NOT NULL AND bom.level < 10
        )
        SELECT pri.ingredient_id, pri.unit, SUM(bom.quantity * pri.quantity) as total_quantity
        FROM bom JOIN public.products p ON p.id = bom.product_id JOIN public.product_recipe_items pri ON pri.product_id = p.id
        WHERE p.stock_level IS NULL AND pri.ingredient_id IS NOT NULL
        GROUP BY pri.ingredient_id, pri.unit
    LOOP
        SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = v_ingredient_deduction.ingredient_id;
        v_conversion_factor := public.get_conversion_factor(v_ingredient_deduction.unit, v_stock_unit, v_ingredient_deduction.ingredient_id);
        v_deduction_amount := v_ingredient_deduction.total_quantity * v_conversion_factor;
        UPDATE public.ingredients SET stock_level = stock_level - v_deduction_amount WHERE id = v_ingredient_deduction.ingredient_id;
    END LOOP;
END;
$$;

-- NEW: Function to restock preparations and deduct ingredients.
CREATE OR REPLACE FUNCTION public.restock_preparation(p_product_id bigint, p_quantity_to_add numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    recipe_item RECORD;
    v_conversion_factor numeric;
    v_deduction_amount numeric;
    v_stock_unit text;
BEGIN
    -- Step 1: Increase the stock of the preparation itself
    UPDATE public.products SET stock_level = stock_level + p_quantity_to_add WHERE id = p_product_id;

    -- Step 2: Decrease the stock of the raw ingredients used in its recipe
    FOR recipe_item IN
        SELECT pri.ingredient_id, pri.quantity, pri.unit
        FROM public.product_recipe_items pri
        WHERE pri.product_id = p_product_id AND pri.ingredient_id IS NOT NULL
    LOOP
        SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = recipe_item.ingredient_id;
        v_conversion_factor := public.get_conversion_factor(recipe_item.unit, v_stock_unit, recipe_item.ingredient_id);
        v_deduction_amount := recipe_item.quantity * p_quantity_to_add * v_conversion_factor;
        UPDATE public.ingredients SET stock_level = stock_level - v_deduction_amount WHERE id = recipe_item.ingredient_id;
    END LOOP;
END;
$$;

-- Section 3: Schema Versioning
INSERT INTO public.schema_migrations (version) VALUES (14) ON CONFLICT (version) DO UPDATE SET migrated_at = now(), version = 14;
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs to be updated to v14 for automatic inventory deduction.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe, non-destructive operation.</strong> The script below will not delete any of your existing data. It just adds new logic and updates functions.
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (to v14)</h2>
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