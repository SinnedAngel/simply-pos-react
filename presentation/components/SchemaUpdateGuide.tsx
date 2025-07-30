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
-- Danum POS - Database Migration Script v9 to v10 (Order Log)
-- This script adds a user_id to orders and functions to view an order log by cashier.

-- Section 1: Add user_id column to orders table
-- It's nullable to support orders created before this update.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES public.users(id);

-- Section 2: Update create_order function to include user_id
DROP FUNCTION IF EXISTS public.create_order(numeric, jsonb);
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


-- Section 3: Add new function to get order log with cashier details
CREATE OR REPLACE FUNCTION public.get_order_log(p_start_date date, p_end_date date)
RETURNS TABLE(
    order_id uuid,
    created_at timestamptz,
    total numeric,
    cashier_username text,
    items jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    o.id as order_id,
    o.created_at,
    o.total,
    u.username as cashier_username,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'productName', p.name,
            'quantity', oi.quantity,
            'price', oi.price
          ) ORDER BY p.name
        )
        FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as items
  FROM public.orders o
  LEFT JOIN public.users u ON o.user_id = u.id
  WHERE o.created_at >= p_start_date AND o.created_at < p_end_date + interval '1 day'
  ORDER BY o.created_at DESC;
$$;


-- Section 4: Schema Versioning
INSERT INTO public.schema_migrations (version) VALUES (10) ON CONFLICT (version) DO UPDATE SET migrated_at = now();
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs to be updated. The script below will bring it to the latest version.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe operation.</strong> The script below will not delete any of your existing products, users, or other data. It migrates your existing data and adds new features.
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (v9 to v10)</h2>
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
