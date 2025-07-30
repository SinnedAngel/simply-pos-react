
import React from 'react';

interface SchemaInitializationGuideProps {
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

const SchemaInitializationGuide: React.FC<SchemaInitializationGuideProps> = ({ onRetry }) => {
  
  const setupSQL = `
-- Danum POS - Full Database Setup v11 (Multi-step Conversions)
-- This script is idempotent and can be run multiple times safely.
-- It adds a more robust, multi-step unit conversion function.

-- Section 1: Core Tables (Users, Roles)
CREATE TABLE IF NOT EXISTS public.roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS public.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE, password_hash text NOT NULL, role_id uuid NOT NULL REFERENCES public.roles(id));
CREATE TABLE IF NOT EXISTS public.role_permissions (role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE, permission text NOT NULL, PRIMARY KEY (role_id, permission));

-- Section 2: Product Catalog, Sales, & Inventory Tables
DO $$ BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
      DROP TABLE public.products CASCADE;
   END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.products (id bigint PRIMARY KEY, name text NOT NULL, price numeric NOT NULL, image_url text NOT NULL);
CREATE TABLE IF NOT EXISTS public.categories (id serial PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS public.product_categories (product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE, PRIMARY KEY (product_id, category_id));
CREATE TABLE IF NOT EXISTS public.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), total numeric NOT NULL, user_id uuid NULL REFERENCES public.users(id));
CREATE TABLE IF NOT EXISTS public.order_items (id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, product_id bigint NOT NULL REFERENCES public.products(id), quantity integer NOT NULL, price numeric NOT NULL);
CREATE TABLE IF NOT EXISTS public.ingredients (id bigserial PRIMARY KEY, name text NOT NULL UNIQUE, stock_level numeric NOT NULL DEFAULT 0, stock_unit text NOT NULL);
CREATE TABLE IF NOT EXISTS public.unit_conversions (id bigserial PRIMARY KEY, from_unit text NOT NULL, to_unit text NOT NULL, factor numeric NOT NULL, ingredient_id bigint NULL REFERENCES public.ingredients(id) ON DELETE CASCADE, UNIQUE(from_unit, to_unit, ingredient_id));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_ingredients' AND column_name='unit') THEN
    CREATE TABLE IF NOT EXISTS public.product_ingredients (product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, ingredient_id bigint NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE, quantity numeric NOT NULL, PRIMARY KEY (product_id, ingredient_id));
    ALTER TABLE public.product_ingredients ADD COLUMN unit text;
    UPDATE public.product_ingredients SET unit = 'pcs';
    ALTER TABLE public.product_ingredients ALTER COLUMN unit SET NOT NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.product_ingredients (product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, ingredient_id bigint NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE, quantity numeric NOT NULL, unit text NOT NULL, PRIMARY KEY (product_id, ingredient_id));


-- Section 3: Product, Category & Inventory Functions
CREATE OR REPLACE FUNCTION public.get_all_categories() RETURNS TABLE(id int, name text) LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT c.id, c.name FROM public.categories c ORDER BY c.name; $$;
DROP FUNCTION IF EXISTS public.get_products_with_categories();
CREATE OR REPLACE FUNCTION public.get_products_with_categories()
RETURNS TABLE(id bigint, name text, price numeric, image_url text, categories text[], recipe jsonb)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id, p.name, p.price, p.image_url,
    COALESCE((SELECT array_agg(c.name) FROM public.product_categories pc JOIN public.categories c ON pc.category_id = c.id WHERE pc.product_id = p.id), '{}'::text[]) as categories,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('ingredientId', pi.ingredient_id, 'ingredientName', i.name, 'quantity', pi.quantity, 'unit', pi.unit)) FROM public.product_ingredients pi JOIN public.ingredients i ON pi.ingredient_id = i.id WHERE pi.product_id = p.id), '[]'::jsonb) as recipe
  FROM public.products p ORDER BY p.name;
$$;
CREATE OR REPLACE FUNCTION public.set_product_categories(p_product_id bigint, p_category_names text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE cat_name text; cat_id int; BEGIN FOREACH cat_name IN ARRAY p_category_names LOOP INSERT INTO public.categories (name) VALUES (cat_name) ON CONFLICT (name) DO NOTHING; END LOOP; DELETE FROM public.product_categories WHERE product_id = p_product_id; IF array_length(p_category_names, 1) > 0 THEN INSERT INTO public.product_categories (product_id, category_id) SELECT p_product_id, c.id FROM public.categories c WHERE c.name = ANY(p_category_names); END IF; END; $$;
CREATE OR REPLACE FUNCTION public.update_category_name(p_old_name text, p_new_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.categories SET name = p_new_name WHERE name = p_old_name; END; $$;
DROP FUNCTION IF EXISTS public.merge_categories(text, text);
CREATE OR REPLACE FUNCTION public.merge_categories(p_source_category_name text, p_destination_category_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_source_id int; v_destination_id int; BEGIN SELECT id INTO v_source_id FROM public.categories WHERE name = p_source_category_name; SELECT id INTO v_destination_id FROM public.categories WHERE name = p_destination_category_name; IF v_source_id IS NULL OR v_destination_id IS NULL THEN RAISE EXCEPTION 'Invalid category name provided.'; END IF; IF v_source_id = v_destination_id THEN RAISE EXCEPTION 'Cannot merge a category into itself.'; END IF; UPDATE public.product_categories SET category_id = v_destination_id WHERE category_id = v_source_id AND product_id NOT IN (SELECT product_id FROM public.product_categories WHERE category_id = v_destination_id); DELETE FROM public.product_categories WHERE category_id = v_source_id; DELETE FROM public.categories WHERE id = v_source_id; END; $$;
CREATE OR REPLACE FUNCTION public.seed_initial_products(products_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    product_item jsonb;
    v_category_names text[];
BEGIN
    TRUNCATE public.products, public.categories, public.product_categories, public.ingredients, public.unit_conversions, public.product_ingredients RESTART IDENTITY CASCADE;
    
    FOR product_item IN SELECT * FROM jsonb_array_elements(products_data)
    LOOP
        INSERT INTO public.products(id, name, price, image_url)
        VALUES (
            (product_item->>'id')::bigint,
            product_item->>'name',
            (product_item->>'price')::numeric,
            product_item->>'imageUrl'
        );
        
        SELECT array_agg(value) INTO v_category_names
        FROM jsonb_array_elements_text(product_item->'categories');
        
        PERFORM public.set_product_categories(
            (product_item->>'id')::bigint,
            v_category_names
        );
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.get_all_ingredients();
CREATE OR REPLACE FUNCTION public.get_all_ingredients() RETURNS TABLE(id bigint, name text, stock_level numeric, stock_unit text) LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT i.id, i.name, i.stock_level, i.stock_unit FROM public.ingredients i ORDER BY i.name; $$;
DROP FUNCTION IF EXISTS public.create_ingredient(text, text, numeric);
CREATE OR REPLACE FUNCTION public.create_ingredient(p_name text, p_stock_unit text, p_initial_stock numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.ingredients (name, stock_unit, stock_level) VALUES (p_name, p_stock_unit, p_initial_stock); END; $$;
DROP FUNCTION IF EXISTS public.update_ingredient(bigint, text, text, numeric);
CREATE OR REPLACE FUNCTION public.update_ingredient(p_id bigint, p_name text, p_stock_unit text, p_stock_level numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.ingredients SET name = p_name, stock_unit = p_stock_unit, stock_level = p_stock_level WHERE id = p_id; END; $$;
DROP FUNCTION IF EXISTS public.delete_ingredient(bigint);
CREATE OR REPLACE FUNCTION public.delete_ingredient(p_id bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN DELETE FROM public.ingredients WHERE id = p_id; END; $$;
DROP FUNCTION IF EXISTS public.set_product_recipe(bigint, jsonb);
CREATE OR REPLACE FUNCTION public.set_product_recipe(p_product_id bigint, p_recipe jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE recipe_item jsonb; BEGIN DELETE FROM public.product_ingredients WHERE product_id = p_product_id; IF jsonb_array_length(p_recipe) > 0 THEN FOR recipe_item IN SELECT * FROM jsonb_array_elements(p_recipe) LOOP INSERT INTO public.product_ingredients (product_id, ingredient_id, quantity, unit) VALUES (p_product_id, (recipe_item->>'ingredientId')::bigint, (recipe_item->>'quantity')::numeric, recipe_item->>'unit'); END LOOP; END IF; END; $$;

-- Section 4: Sales, Seeding & Conversion Functions
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
DROP FUNCTION IF EXISTS public.create_order(numeric, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.create_order(p_total numeric, p_items jsonb, p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_order_id uuid; order_item jsonb; recipe_item record; v_stock_unit text; v_conversion_factor numeric; v_deduction_amount numeric; BEGIN INSERT INTO public.orders (total, user_id) VALUES (p_total, p_user_id) RETURNING id INTO v_order_id; FOR order_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP INSERT INTO public.order_items (order_id, product_id, quantity, price) VALUES (v_order_id, (order_item->>'product_id')::bigint, (order_item->>'quantity')::integer, (order_item->>'price')::numeric); FOR recipe_item IN SELECT pi.ingredient_id, pi.quantity AS recipe_quantity, pi.unit AS recipe_unit FROM public.product_ingredients pi WHERE pi.product_id = (order_item->>'product_id')::bigint LOOP SELECT stock_unit INTO v_stock_unit FROM public.ingredients WHERE id = recipe_item.ingredient_id; v_conversion_factor := public.get_conversion_factor(recipe_item.recipe_unit, v_stock_unit, recipe_item.ingredient_id); v_deduction_amount := recipe_item.recipe_quantity * v_conversion_factor * (order_item->>'quantity')::numeric; UPDATE public.ingredients SET stock_level = stock_level - v_deduction_amount WHERE id = recipe_item.ingredient_id; END LOOP; END LOOP; END; $$;
CREATE OR REPLACE FUNCTION public.get_sales_report(p_start_date date, p_end_date date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE report jsonb; BEGIN SELECT jsonb_build_object('totalRevenue', COALESCE(SUM(o.total), 0), 'orderCount', COUNT(o.id), 'avgOrderValue', COALESCE(AVG(o.total), 0), 'dailySales', (SELECT COALESCE(jsonb_agg(ds), '[]'::jsonb) FROM (SELECT DATE(o2.created_at) AS date, SUM(o2.total) AS total FROM public.orders o2 WHERE o2.created_at >= p_start_date AND o2.created_at < p_end_date + interval '1 day' GROUP BY DATE(o2.created_at) ORDER BY date) ds), 'topProducts', (SELECT COALESCE(jsonb_agg(tp), '[]'::jsonb) FROM (SELECT p.name AS name, p.price AS price, SUM(oi.quantity) AS quantity FROM public.order_items oi JOIN public.products p ON oi.product_id = p.id JOIN public.orders o3 ON oi.order_id = o3.id WHERE o3.created_at >= p_start_date AND o3.created_at < p_end_date + interval '1 day' GROUP BY p.name, p.price ORDER BY quantity DESC LIMIT 10) tp)) INTO report FROM public.orders o WHERE o.created_at >= p_start_date AND o.created_at < p_end_date + interval '1 day'; RETURN report; END; $$;
CREATE OR REPLACE FUNCTION public.get_order_log(p_start_date date, p_end_date date) RETURNS TABLE(order_id uuid, created_at timestamptz, total numeric, cashier_username text, items jsonb) LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT o.id as order_id, o.created_at, o.total, u.username as cashier_username, COALESCE((SELECT jsonb_agg(jsonb_build_object('productName', p.name, 'quantity', oi.quantity, 'price', oi.price) ORDER BY p.name) FROM public.order_items oi JOIN public.products p ON oi.product_id = p.id WHERE oi.order_id = o.id), '[]'::jsonb) as items FROM public.orders o LEFT JOIN public.users u ON o.user_id = u.id WHERE o.created_at >= p_start_date AND o.created_at < p_end_date + interval '1 day' ORDER BY o.created_at DESC; $$;
CREATE OR REPLACE FUNCTION public.seed_inventory_and_recipes() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_espresso_id bigint; v_cappuccino_id bigint; v_iced_latte_id bigint; v_croissant_id bigint; v_sugar_id bigint; v_coffee_beans_id bigint; v_milk_id bigint; v_croissant_dough_id bigint; BEGIN TRUNCATE public.ingredients, public.unit_conversions, public.product_ingredients RESTART IDENTITY CASCADE; INSERT INTO public.ingredients (name, stock_level, stock_unit) VALUES ('Coffee Beans', 1000, 'gram'), ('Sugar', 5000, 'gram'), ('Milk', 10000, 'ml'), ('Croissant Dough', 50, 'pcs'), ('Cinnamon Filling', 2000, 'gram'), ('Sourdough Bread', 100, 'slice'), ('Avocado', 30, 'pcs'), ('Green Tea Leaves', 500, 'gram'), ('Black Tea Leaves', 500, 'gram'), ('Chocolate', 3000, 'gram'), ('Turkey Slices', 200, 'slice'), ('Orange', 50, 'pcs'), ('Muffin Mix', 5000, 'gram'), ('Blueberries', 1000, 'gram') ON CONFLICT (name) DO NOTHING; SELECT id INTO v_espresso_id FROM public.products WHERE name = 'Espresso'; SELECT id INTO v_cappuccino_id FROM public.products WHERE name = 'Cappuccino'; SELECT id INTO v_iced_latte_id FROM public.products WHERE name = 'Iced Latte'; SELECT id INTO v_croissant_id FROM public.products WHERE name = 'Croissant'; SELECT id INTO v_sugar_id FROM public.ingredients WHERE name = 'Sugar'; SELECT id INTO v_coffee_beans_id FROM public.ingredients WHERE name = 'Coffee Beans'; SELECT id INTO v_milk_id FROM public.ingredients WHERE name = 'Milk'; SELECT id INTO v_croissant_dough_id FROM public.ingredients WHERE name = 'Croissant Dough'; INSERT INTO public.unit_conversions (from_unit, to_unit, factor, ingredient_id) VALUES ('teaspoon', 'gram', 4.2, v_sugar_id), ('tablespoon', 'gram', 12.5, v_sugar_id), ('kilogram', 'gram', 1000, NULL), ('liter', 'ml', 1000, NULL) ON CONFLICT DO NOTHING; IF v_espresso_id IS NOT NULL AND v_coffee_beans_id IS NOT NULL THEN INSERT INTO public.product_ingredients (product_id, ingredient_id, quantity, unit) VALUES (v_espresso_id, v_coffee_beans_id, 7, 'gram'); END IF; IF v_cappuccino_id IS NOT NULL AND v_coffee_beans_id IS NOT NULL AND v_milk_id IS NOT NULL THEN INSERT INTO public.product_ingredients (product_id, ingredient_id, quantity, unit) VALUES (v_cappuccino_id, v_coffee_beans_id, 7, 'gram'), (v_cappuccino_id, v_milk_id, 100, 'ml'); END IF; IF v_iced_latte_id IS NOT NULL AND v_coffee_beans_id IS NOT NULL AND v_milk_id IS NOT NULL THEN INSERT INTO public.product_ingredients (product_id, ingredient_id, quantity, unit) VALUES (v_iced_latte_id, v_coffee_beans_id, 14, 'gram'), (v_iced_latte_id, v_milk_id, 150, 'ml'); END IF; IF v_croissant_id IS NOT NULL AND v_croissant_dough_id IS NOT NULL THEN INSERT INTO public.product_ingredients (product_id, ingredient_id, quantity, unit) VALUES (v_croissant_id, v_croissant_dough_id, 1, 'pcs'); END IF; END; $$;
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


-- Section 5. User & Auth Functions
CREATE OR REPLACE FUNCTION public.login(p_password_hash text, p_username text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE user_record public.users; role_record public.roles; permissions_array text[]; result json; BEGIN SELECT * INTO user_record FROM public.users WHERE username = p_username; IF user_record IS NULL THEN RETURN NULL; END IF; IF user_record.password_hash != p_password_hash THEN RETURN NULL; END IF; SELECT * INTO role_record FROM public.roles WHERE id = user_record.role_id; SELECT array_agg(permission) INTO permissions_array FROM public.role_permissions WHERE role_id = user_record.role_id; result := json_build_object('id', user_record.id, 'username', user_record.username, 'role', role_record.name, 'permissions', COALESCE(permissions_array, ARRAY[]::text[])); RETURN result; END; $$;
CREATE OR REPLACE FUNCTION public.create_user(p_password_hash text, p_role_name text, p_username text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role_id uuid; BEGIN SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name; IF v_role_id IS NULL THEN RAISE EXCEPTION 'Invalid role specified: %', p_role_name; END IF; INSERT INTO public.users (username, password_hash, role_id) VALUES (p_username, p_password_hash, v_role_id); END; $$;
CREATE OR REPLACE FUNCTION public.get_all_users() RETURNS TABLE(id uuid, username text, role text) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY SELECT u.id, u.username, r.name as role FROM public.users u JOIN public.roles r ON u.role_id = r.id ORDER BY u.username; END; $$;
CREATE OR REPLACE FUNCTION public.update_user(p_role_name text, p_user_id uuid, p_username text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role_id uuid; BEGIN SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name; IF v_role_id IS NULL THEN RAISE EXCEPTION 'Invalid role specified: %', p_role_name; END IF; UPDATE public.users SET username = p_username, role_id = v_role_id WHERE id = p_user_id; END; $$;
CREATE OR REPLACE FUNCTION public.delete_user(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF (SELECT count(*) FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE r.name = 'admin') = 1 THEN IF (SELECT r.name FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = p_user_id) = 'admin' THEN RAISE EXCEPTION 'Cannot delete the last admin account.'; END IF; END IF; DELETE FROM public.users WHERE id = p_user_id; END; $$;
CREATE OR REPLACE FUNCTION public.update_user_password(p_user_id uuid, p_new_password_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.users SET password_hash = p_new_password_hash WHERE id = p_user_id; END; $$;
CREATE OR REPLACE FUNCTION public.get_all_roles() RETURNS TABLE(id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT r.id, r.name FROM public.roles r ORDER BY r.name; $$;
CREATE OR REPLACE FUNCTION public.create_role(p_role_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.roles (name) VALUES (p_role_name); END; $$;
CREATE OR REPLACE FUNCTION public.update_role(p_role_id uuid, p_role_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role_name text; BEGIN SELECT name INTO v_role_name FROM public.roles WHERE id = p_role_id; IF v_role_name IN ('admin') THEN RAISE EXCEPTION 'Cannot update protected role: %.', v_role_name; END IF; UPDATE public.roles SET name = p_role_name WHERE id = p_role_id; END; $$;
CREATE OR REPLACE FUNCTION public.delete_role(p_role_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role_name text; v_user_count int; BEGIN SELECT name INTO v_role_name FROM public.roles WHERE id = p_role_id; IF v_role_name IN ('admin') THEN RAISE EXCEPTION 'Cannot delete protected role: %', v_role_name; END IF; SELECT count(*) INTO v_user_count FROM public.users WHERE role_id = p_role_id; IF v_user_count > 0 THEN RAISE EXCEPTION 'Cannot delete role "%" as it is assigned to % user(s).', v_role_name, v_user_count; END IF; DELETE FROM public.roles WHERE id = p_role_id; END; $$;
CREATE OR REPLACE FUNCTION public.get_all_role_permissions() RETURNS json LANGUAGE sql SECURITY DEFINER AS $$ SELECT json_object_agg(role_id, permissions) FROM (SELECT role_id, json_agg(permission) as permissions FROM public.role_permissions GROUP BY role_id) as grouped_permissions; $$;
CREATE OR REPLACE FUNCTION public.set_role_permissions(p_role_id uuid, p_permissions text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role_name text; BEGIN SELECT name INTO v_role_name FROM public.roles WHERE id = p_role_id; IF v_role_name = 'admin' THEN RAISE EXCEPTION 'Cannot modify permissions for the protected "admin" role.'; END IF; DELETE FROM public.role_permissions WHERE role_id = p_role_id; IF array_length(p_permissions, 1) > 0 THEN INSERT INTO public.role_permissions (role_id, permission) SELECT p_role_id, unnest(p_permissions); END IF; END; $$;

-- Section 6. Seed Initial Data (Roles, Admin User, Permissions)
DO $$
DECLARE admin_role_id uuid; cashier_role_id uuid;
BEGIN
  INSERT INTO public.roles (name) VALUES ('admin'), ('cashier'), ('barista') ON CONFLICT (name) DO NOTHING;
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO cashier_role_id FROM public.roles WHERE name = 'cashier';
  IF NOT EXISTS (SELECT 1 FROM public.users) THEN INSERT INTO public.users (username, password_hash, role_id) VALUES ('admin', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', admin_role_id); END IF;
  DELETE FROM public.role_permissions WHERE role_id = admin_role_id;
  INSERT INTO public.role_permissions (role_id, permission) VALUES 
    (admin_role_id, 'manage_menu'), (admin_role_id, 'manage_categories'), 
    (admin_role_id, 'manage_media'), (admin_role_id, 'manage_accounts'), 
    (admin_role_id, 'manage_roles'), (admin_role_id, 'view_reports'),
    (admin_role_id, 'manage_inventory'), (admin_role_id, 'manage_conversions'),
    (admin_role_id, 'create_sales')
  ON CONFLICT DO NOTHING;
  DELETE FROM public.role_permissions WHERE role_id = cashier_role_id;
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (cashier_role_id, 'manage_media'),
    (cashier_role_id, 'create_sales')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Section 7. Policies and Permissions
GRANT USAGE ON SCHEMA public TO anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow full access" ON public.products FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow full access" ON public.categories FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY "Allow public read access" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Allow full access" ON public.product_categories FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY "Allow full access to orders" ON public.orders FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Allow full access to order items" ON public.order_items FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Allow full access to ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Allow full access to product_ingredients" ON public.product_ingredients FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Allow full access to unit_conversions" ON public.unit_conversions FOR ALL USING (true) WITH CHECK(true);


-- Section 8. Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']) ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Allow anonymous access to product images" ON storage.objects;
CREATE POLICY "Allow anonymous access to product images" ON storage.objects FOR ALL USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

-- Section 9. Schema Versioning
CREATE TABLE IF NOT EXISTS public.schema_migrations (version bigint PRIMARY KEY, migrated_at timestamptz DEFAULT now() NOT NULL);
INSERT INTO public.schema_migrations (version) VALUES (11) ON CONFLICT (version) DO UPDATE SET migrated_at = now();
`.trim();
  
  const supabaseSqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";

  return (
    <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Database Setup Required</h1>
        <p className="text-text-secondary mt-2">
          Your database schema is incomplete. To ensure the application runs correctly, please run the setup script below.
        </p>
      </div>
      <div className="space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
            <ol className="list-decimal list-inside space-y-4 text-text-secondary bg-surface-main p-4 rounded-lg">
                 <li>
                    <strong>Copy the SQL script</strong> provided below. This script is idempotent, meaning it's safe to run multiple times. It will only create what's missing.
                </li>
                <li>
                    <strong>Open the Supabase SQL Editor</strong> for your project using the link below.
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">Complete Setup Script (v11)</h2>
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

export default SchemaInitializationGuide;
