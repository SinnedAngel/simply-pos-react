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
-- Danum POS - Database Migration Script to v20 (Editable Purchase Date)
-- This is a non-destructive script to allow setting the purchase date manually.

-- Section 1: Update the log_purchase function to accept a date
CREATE OR REPLACE FUNCTION public.log_purchase(p_ingredient_id bigint, p_quantity numeric, p_unit text, p_total_cost numeric, p_user_id uuid, p_supplier text DEFAULT NULL, p_notes text DEFAULT NULL, p_created_at timestamptz DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock_unit text;
  v_conversion_factor numeric;
  v_stock_to_add numeric;
BEGIN
  INSERT INTO public.purchase_log (created_at, ingredient_id, quantity_purchased, unit, total_cost, user_id, supplier, notes)
  VALUES (p_created_at, p_ingredient_id, p_quantity, p_unit, p_total_cost, p_user_id, p_supplier, p_notes);

  SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = p_ingredient_id;
  v_conversion_factor := public.get_conversion_factor(p_unit, v_stock_unit, p_ingredient_id);
  v_stock_to_add := p_quantity * v_conversion_factor;

  UPDATE public.ingredients SET stock_level = stock_level + v_stock_to_add WHERE id = p_ingredient_id;
END;
$$;

-- Section 2: Update schema version to 20
INSERT INTO public.schema_migrations (version) VALUES (20) ON CONFLICT (version) DO UPDATE SET migrated_at = now(), version = 20;
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs an update to v20 to enable editable purchase dates.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe, non-destructive operation.</strong> The script below will not delete any of your existing data. It will only add the new functionality.
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
                    After the script executes, return here and click the <strong>"Try Again"</strong> button. The app will log you out to refresh your permissions.
                </li>
            </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (to v20)</h2>
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