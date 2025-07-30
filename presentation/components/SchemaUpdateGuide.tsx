
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
-- Gemini POS - Database Migration Script v7 to v8 (Conversion Management)
-- This script safely migrates your schema to add management functions for unit conversions.
-- It will NOT delete any of your existing products, users, or other data.

-- Section 1: Add New Permission for Conversion Management
DO $$
DECLARE admin_role_id uuid;
BEGIN
  -- Add the new permission and assign it to the 'admin' role
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission)
    VALUES (admin_role_id, 'manage_conversions')
    ON CONFLICT (role_id, permission) DO NOTHING;
  END IF;
END;
$$;


-- Section 2: Create New Functions for Managing Conversions
DROP FUNCTION IF EXISTS public.get_all_conversions();
CREATE OR REPLACE FUNCTION public.get_all_conversions()
RETURNS TABLE(id bigint, from_unit text, to_unit text, factor numeric, ingredient_id bigint, ingredient_name text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT uc.id, uc.from_unit, uc.to_unit, uc.factor, uc.ingredient_id, i.name as ingredient_name
  FROM public.unit_conversions uc
  LEFT JOIN public.ingredients i ON uc.ingredient_id = i.id
  ORDER BY i.name, uc.from_unit;
$$;

DROP FUNCTION IF EXISTS public.create_conversion(text,text,numeric,bigint);
CREATE OR REPLACE FUNCTION public.create_conversion(p_from_unit text, p_to_unit text, p_factor numeric, p_ingredient_id bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.unit_conversions (from_unit, to_unit, factor, ingredient_id)
  VALUES (p_from_unit, p_to_unit, p_factor, p_ingredient_id);
END;
$$;

DROP FUNCTION IF EXISTS public.update_conversion(bigint,text,text,numeric,bigint);
CREATE OR REPLACE FUNCTION public.update_conversion(p_id bigint, p_from_unit text, p_to_unit text, p_factor numeric, p_ingredient_id bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.unit_conversions
  SET from_unit = p_from_unit, to_unit = p_to_unit, factor = p_factor, ingredient_id = p_ingredient_id
  WHERE id = p_id;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_conversion(bigint);
CREATE OR REPLACE FUNCTION public.delete_conversion(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.unit_conversions WHERE id = p_id;
END;
$$;

-- Section 3: Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.get_all_conversions() TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_conversion(text,text,numeric,bigint) TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_conversion(bigint,text,text,numeric,bigint) TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_conversion(bigint) TO anon, service_role;


-- Section 4: Schema Versioning
-- Update version to 8
INSERT INTO public.schema_migrations (version) VALUES (8) ON CONFLICT (version) DO UPDATE SET migrated_at = now();
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Update Script (v7 to v8)</h2>
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
