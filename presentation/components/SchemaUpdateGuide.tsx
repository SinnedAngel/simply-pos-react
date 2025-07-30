
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
-- Danum POS - Database Migration Script v10 to v11 (Multi-step Conversions)
-- This script updates the unit conversion function to support multi-step paths.

-- Section 1: Replace the unit conversion function with a more robust version
DROP FUNCTION IF EXISTS public.get_conversion_factor(text, text, bigint);
CREATE OR REPLACE FUNCTION public.get_conversion_factor(p_from_unit text, p_to_unit text, p_ingredient_id bigint)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_factor numeric;
BEGIN
    IF p_from_unit = p_to_unit THEN
        RETURN 1.0;
    END IF;

    WITH RECURSIVE all_possible_edges AS (
        -- Get all applicable conversions, both direct and inverse
        SELECT from_unit, to_unit, factor, ingredient_id FROM public.unit_conversions WHERE ingredient_id = p_ingredient_id OR ingredient_id IS NULL
        UNION ALL
        SELECT to_unit as from_unit, from_unit as to_unit, 1.0/factor as factor, ingredient_id FROM public.unit_conversions WHERE ingredient_id = p_ingredient_id OR ingredient_id IS NULL
    ),
    distinct_edges AS (
        -- For each from/to pair, pick the most specific conversion (ingredient-specific wins over generic)
        SELECT DISTINCT ON (from_unit, to_unit) from_unit, to_unit, factor
        FROM all_possible_edges
        ORDER BY from_unit, to_unit, ingredient_id DESC NULLS LAST
    ),
    conversion_path AS (
        -- Base case: start from the source unit
        SELECT
            p_from_unit as end_unit,
            1.0::numeric as total_factor,
            ARRAY[p_from_unit] as path_array,
            1 as depth
        UNION ALL
        -- Recursive step: explore next conversions
        SELECT
            de.to_unit as end_unit,
            cp.total_factor * de.factor,
            cp.path_array || de.to_unit,
            cp.depth + 1
        FROM
            conversion_path cp
        JOIN
            distinct_edges de ON cp.end_unit = de.from_unit
        WHERE
            NOT (de.to_unit = ANY(cp.path_array)) -- avoid cycles
            AND cp.depth < 10 -- prevent infinite loops
    )
    SELECT
        total_factor
    INTO
        v_factor
    FROM
        conversion_path
    WHERE
        end_unit = p_to_unit
    ORDER BY
        depth ASC -- find the shortest path first
    LIMIT 1;

    IF v_factor IS NOT NULL THEN
        RETURN v_factor;
    END IF;

    RAISE EXCEPTION 'No conversion path found from % to %.', p_from_unit, p_to_unit;
END;
$$;


-- Section 2: Update create_order function to use the new conversion logic
-- (The function body does not change, but it's good practice to re-apply it to ensure consistency)
DROP FUNCTION IF EXISTS public.create_order(numeric, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.create_order(p_total numeric, p_items jsonb, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_order_id uuid;
    order_item jsonb;
    recipe_item record;
    v_stock_unit text;
    v_conversion_factor numeric;
    v_deduction_amount numeric;
BEGIN
    INSERT INTO public.orders (total, user_id) VALUES (p_total, p_user_id) RETURNING id INTO v_order_id;
    FOR order_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, (order_item->>'product_id')::bigint, (order_item->>'quantity')::integer, (order_item->>'price')::numeric);

        FOR recipe_item IN
            SELECT pi.ingredient_id, pi.quantity AS recipe_quantity, pi.unit AS recipe_unit
            FROM public.product_ingredients pi
            WHERE pi.product_id = (order_item->>'product_id')::bigint
        LOOP
            SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = recipe_item.ingredient_id;
            v_conversion_factor := public.get_conversion_factor(recipe_item.recipe_unit, v_stock_unit, recipe_item.ingredient_id);
            v_deduction_amount := recipe_item.recipe_quantity * v_conversion_factor * (order_item->>'quantity')::numeric;
            UPDATE public.ingredients SET stock_level = stock_level - v_deduction_amount WHERE id = recipe_item.ingredient_id;
        END LOOP;
    END LOOP;
END;
$$;


-- Section 3: Schema Versioning
INSERT INTO public.schema_migrations (version) VALUES (11) ON CONFLICT (version) DO UPDATE SET migrated_at = now();
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs to be updated to v11 for more robust unit conversions.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe operation.</strong> The script below will not delete any of your existing data. It just updates a database function.
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (v10 to v11)</h2>
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
