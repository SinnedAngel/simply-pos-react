// Specific type for recipe items returned by RPC.
// Defined locally to prevent complex cross-file type resolution issues in the Database type.
export type RpcRecipeItem =
  | {
      type: 'ingredient';
      ingredientId: number;
      ingredientName: string;
      quantity: number;
      unit: string;
    }
  | {
      type: 'product';
      productId: number;
      productName: string;
      quantity: number;
      unit: string;
    };

// Specific type for the result of the 'get_products_with_categories' RPC
// This avoids using a generic 'Json' type which can cause compiler issues.
export type RpcProduct = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  categories: string[];
  recipe: RpcRecipeItem[];
  is_for_sale: boolean;
  stock_level: number | null;
  stock_unit: string | null;
};

// Type for ingredients returned by `get_all_ingredients` RPC
export type RpcIngredient = {
  id: number;
  name: string;
  stock_level: number;
  stock_unit: string;
};

// Type for conversions returned by `get_all_conversions` RPC
export type RpcConversion = {
  id: number;
  from_unit: string;
  to_unit: string;
  factor: number;
  ingredient_id: number | null;
  ingredient_name: string | null;
};

// Specific type for the data passed to the 'seed_initial_products' RPC
export type SeedProduct = {
  id: number;
  name:string;
  price: number;
  categories: string[];
  imageUrl: string;
};

// Specific type for the items array in the 'create_order' RPC
export type OrderItemParam = {
  product_id: number;
  quantity: number;
  price: number;
};

// Type for the recipe items passed to the 'set_product_recipe' RPC
export type RpcRecipeParamItem = {
    ingredientId?: number | null;
    productId?: number | null;
    quantity: number;
    unit: string;
};

// Type for the entire sales report returned by the 'get_sales_report' RPC
export type RpcSaleReport = {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  dailySales: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; price: number }[];
  totalExpenses: number;
  netProfit: number;
  dailyExpenses: { date: string; total: number }[];
};

// Type for order items returned by the order log RPC
export type RpcOrderLogItemProduct = {
  productName: string;
  quantity: number;
  price: number;
};

// Type for the result of the 'get_order_log' RPC
export type RpcOrderLogItem = {
  order_id: string;
  created_at: string;
  total: number;
  cashier_username: string | null;
  items: RpcOrderLogItemProduct[];
};

// Type for the result of the 'get_purchase_log' RPC
export type RpcPurchaseLogItem = {
    id: number;
    created_at: string;
    total_cost: number;
    cashier_username: string | null;
    ingredient_name: string;
    quantity_purchased: number;
    unit: string;
    supplier: string | null;
    notes: string | null;
};


// Type for open orders returned by the 'get_all_open_orders' RPC
export type RpcOpenOrder = {
  table_number: string;
  order_data: any; // Supabase returns jsonb as `any`
};


export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: number;
          name: string;
          price: number;
          image_url: string;
          is_for_sale: boolean;
          stock_level: number | null;
          stock_unit: string | null;
        };
        Insert: {
          id: number;
          name: string;
          price: number;
          image_url: string;
          is_for_sale?: boolean;
          stock_level?: number | null;
          stock_unit?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          price?: number;
          image_url?: string;
          is_for_sale?: boolean;
          stock_level?: number | null;
          stock_unit?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          product_id: number;
          category_id: number;
        };
        Insert: {
          product_id: number;
          category_id: number;
        };
        Update: {
          product_id?: number;
          category_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          role_id: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          role_id: string;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission: string;
        };
        Insert: {
          role_id: string;
          permission: string;
        };
        Update: {
          role_id?: string;
          permission?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };
      schema_migrations: {
        Row: {
          version: number;
          migrated_at: string;
        };
        Insert: {
          version: number;
          migrated_at?: string;
        };
        Update: {
          version?: number;
          migrated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          total: number;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          total: number;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          total?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: number;
          order_id: string;
          product_id: number;
          quantity: number;
          price: number;
        };
        Insert: {
          id?: number;
          order_id: string;
          product_id: number;
          quantity: number;
          price: number;
        };
        Update: {
          id?: number;
          order_id?: string;
          product_id?: number;
          quantity?: number;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      ingredients: {
        Row: {
            id: number;
            name: string;
            stock_level: number;
            stock_unit: string;
        };
        Insert: {
            id?: number;
            name: string;
            stock_level: number;
            stock_unit: string;
        };
        Update: {
            id?: number;
            name?: string;
            stock_level?: number;
            stock_unit?: string;
        };
        Relationships: [];
      };
      product_recipe_items: {
        Row: {
            id: number;
            product_id: number;
            ingredient_id: number | null;
            sub_product_id: number | null;
            quantity: number;
            unit: string;
        };
        Insert: {
            id?: number;
            product_id: number;
            ingredient_id?: number | null;
            sub_product_id?: number | null;
            quantity: number;
            unit: string;
        };
        Update: {
            id?: number;
            product_id?: number;
            ingredient_id?: number | null;
            sub_product_id?: number | null;
            quantity?: number;
            unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_recipe_items_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_recipe_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_recipe_items_sub_product_id_fkey";
            columns: ["sub_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      unit_conversions: {
        Row: {
          id: number;
          from_unit: string;
          to_unit: string;
          factor: number;
          ingredient_id: number | null;
        };
        Insert: {
          id?: number;
          from_unit: string;
          to_unit: string;
          factor: number;
          ingredient_id?: number | null;
        };
        Update: {
          id?: number;
          from_unit?: string;
          to_unit?: string;
          factor?: number;
          ingredient_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "unit_conversions_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          }
        ];
      };
      open_orders: {
        Row: {
          id: string;
          table_number: string;
          order_data: any;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_number: string;
          order_data: any;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_number?: string;
          order_data?: any;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "open_orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      purchase_log: {
        Row: {
          id: number;
          created_at: string;
          ingredient_id: number;
          quantity_purchased: number;
          unit: string;
          total_cost: number;
          user_id: string | null;
          supplier: string | null;
          notes: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          ingredient_id: number;
          quantity_purchased: number;
          unit: string;
          total_cost: number;
          user_id?: string | null;
          supplier?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          ingredient_id?: number;
          quantity_purchased?: number;
          unit?: string;
          total_cost?: number;
          user_id?: string | null;
          supplier?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_log_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_conversion_factor: {
        Args: {
          p_from_unit: string;
          p_to_unit: string;
          p_ingredient_id: number;
        };
        Returns: number;
      };
      create_user: {
        Args: {
          p_username: string;
          p_password_hash: string;
          p_role_name: string;
        };
        Returns: void;
      };
      get_all_categories: {
        Args: Record<string, unknown>;
        Returns: { id: number, name: string }[];
      };
      get_products_with_categories: {
        Args: Record<string, unknown>;
        Returns: RpcProduct[];
      };
      set_product_categories: {
        Args: {
          p_product_id: number;
          p_category_names: string[];
        };
        Returns: void;
      };
      login: {
        Args: {
          p_username: string;
          p_password_hash: string;
        };
        Returns: {
          id: string;
          username: string;
          role: string;
          permissions: string[];
        };
      };
      get_all_users: {
        Args: Record<string, unknown>;
        Returns: { id: string; username: string; role: string }[];
      };
      update_user: {
        Args: {
          p_user_id: string;
          p_username: string;
          p_role_name: string;
        };
        Returns: void;
      };
      update_user_password: {
        Args: {
          p_user_id: string;
          p_new_password_hash: string;
        };
        Returns: void;
      };
      delete_user: {
        Args: {
          p_user_id: string;
        };
        Returns: void;
      };
      get_all_roles: {
        Args: Record<string, unknown>;
        Returns: { id: string; name: string }[];
      };
      create_role: {
        Args: {
          p_role_name: string;
        };
        Returns: void;
      };
      update_role: {
        Args: {
          p_role_id: string;
          p_role_name: string;
        };
        Returns: void;
      };
      delete_role: {
        Args: {
          p_role_id: string;
        };
        Returns: void;
      };
      get_all_role_permissions: {
        Args: Record<string, unknown>;
        Returns: Record<string, string[]>;
      };
      set_role_permissions: {
        Args: {
          p_role_id: string;
          p_permissions: string[];
        };
        Returns: void;
      };
      update_category_name: {
        Args: {
          p_old_name: string;
          p_new_name: string;
        };
        Returns: void;
      };
      merge_categories: {
        Args: {
          p_source_category_name: string;
          p_destination_category_name: string;
        };
        Returns: void;
      };
      seed_initial_products: {
        Args: {
          products_data: SeedProduct[];
        };
        Returns: void;
      };
      create_order: {
        Args: {
          p_total: number;
          p_items: OrderItemParam[];
          p_user_id: string;
        };
        Returns: void;
      };
      get_sales_report: {
        Args: {
          p_start_date: string;
          p_end_date: string;
        };
        Returns: RpcSaleReport;
      };
      get_order_log: {
        Args: {
          p_start_date: string;
          p_end_date: string;
        };
        Returns: RpcOrderLogItem[];
      };
      // Inventory & Conversion Functions
      get_all_ingredients: {
        Args: Record<string, unknown>;
        Returns: RpcIngredient[];
      };
      create_ingredient: {
        Args: {
          p_name: string;
          p_stock_unit: string;
          p_initial_stock: number;
        };
        Returns: void;
      };
      update_ingredient: {
        Args: {
          p_id: number;
          p_name: string;
          p_stock_unit: string;
          p_stock_level: number;
        };
        Returns: void;
      };
      delete_ingredient: {
        Args: {
          p_id: number;
        };
        Returns: void;
      };
      set_product_recipe: {
        Args: {
            p_product_id: number;
            p_recipe: RpcRecipeParamItem[];
        };
        Returns: void;
      };
      restock_preparation: {
        Args: {
          p_product_id: number;
          p_quantity_to_add: number;
        };
        Returns: void;
      };
      seed_inventory_and_recipes: {
        Args: Record<string, unknown>;
        Returns: void;
      };
      get_all_conversions: {
        Args: Record<string, unknown>;
        Returns: RpcConversion[];
      };
      create_conversion: {
        Args: {
            p_from_unit: string;
            p_to_unit: string;
            p_factor: number;
            p_ingredient_id?: number;
        };
        Returns: void;
      };
      update_conversion: {
        Args: {
            p_id: number;
            p_from_unit: string;
            p_to_unit: string;
            p_factor: number;
            p_ingredient_id?: number;
        };
        Returns: void;
      };
      delete_conversion: {
        Args: {
            p_id: number;
        };
        Returns: void;
      };
       // Open Order Functions
      get_all_open_orders: {
        Args: Record<string, unknown>;
        Returns: RpcOpenOrder[];
      };
      save_open_order: {
        Args: {
          p_order_data: any;
          p_table_number: string;
          p_user_id: string;
        };
        Returns: void;
      };
      close_open_order: {
        Args: {
          p_table_number: string;
        };
        Returns: void;
      };
      // Purchase Log Functions
      log_purchase: {
        Args: {
          p_ingredient_id: number;
          p_quantity: number;
          p_unit: string;
          p_total_cost: number;
          p_user_id: string;
          p_supplier?: string;
          p_notes?: string;
          p_created_at?: string;
        };
        Returns: void;
      };
      get_purchase_log: {
        Args: {
          p_end_date: string;
          p_start_date: string;
        };
        Returns: RpcPurchaseLogItem[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}