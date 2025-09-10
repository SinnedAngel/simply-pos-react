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
-- Danum POS - Database Migration Script to v17 (Open Orders Feature Fix)
-- This is a comprehensive, non-destructive script to ensure the open orders feature is correctly installed.
-- It can be run safely on any previous schema version to fix missing tables or functions.

-- Section 1: Ensure the open_orders table and its trigger exist.
CREATE TABLE IF NOT EXISTS public.open_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL UNIQUE,
  order_data jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_open_orders_updated_at ON public.open_orders;
CREATE TRIGGER set_open_orders_updated_at
BEFORE UPDATE ON public.open_orders
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Section 2: Recreate all open order functions with the correct signatures.
CREATE OR REPLACE FUNCTION public.get_all_open_orders()
RETURNS TABLE(table_number text, order_data jsonb)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT o.table_number, o.order_data FROM public.open_orders o ORDER BY o.table_number;
$$;

CREATE OR REPLACE FUNCTION public.save_open_order(p_order_data jsonb, p_table_number text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.open_orders (table_number, order_data, user_id)
  VALUES (p_table_number, p_order_data, p_user_id)
  ON CONFLICT (table_number)
  DO UPDATE SET
    order_data = EXCLUDED.order_data,
    user_id = EXCLUDED.user_id,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.close_open_order(p_table_number text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.open_orders WHERE table_number = p_table_number;
END;
$$;

-- Section 3: Ensure RLS and policies are correctly set.
ALTER TABLE public.open_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to open orders" ON public.open_orders;
CREATE POLICY "Allow full access to open orders" ON public.open_orders
FOR ALL
USING (true)
WITH CHECK (true);

-- Section 4: Update schema version to 17.
INSERT INTO public.schema_migrations (version) VALUES (17) ON CONFLICT (version) DO UPDATE SET migrated_at = now(), version = 17;
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Update Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is out of date and needs an update to v17 to apply critical fixes.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                <li>
                  <strong>This is a safe, non-destructive operation.</strong> The script below will not delete any of your existing data. It will create missing tables and functions to fix the application.
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (to v17)</h2>
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