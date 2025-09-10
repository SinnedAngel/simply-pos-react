// --- DOMAIN ENTITIES ---
// These are the core data structures of the application, representing the business objects.
// They have no dependencies and are used throughout the application.

export interface Ingredient {
  id: number;
  name: string;
  stockLevel: number;
  stockUnit: string;
}

export interface IngredientRecipeItem {
  type: 'ingredient';
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface ProductRecipeItem {
  type: 'product';
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
}

export type RecipeItem = IngredientRecipeItem | ProductRecipeItem;

export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  categories: string[];
  recipe: RecipeItem[];
  isForSale: boolean;
  stockLevel: number | null;
  stockUnit: string | null;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Order {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface OpenOrder {
    tableNumber: string;
    order: Order;
}

export interface UserSession {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface ListedUser {
  id: string;
  username: string;
  role: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface StoredImage {
  name: string;
  url: string;
}

export interface UnitConversion {
  id: number;
  fromUnit: string;
  toUnit: string;
  factor: number;
  ingredientId: number | null;
  ingredientName: string | null; // denormalized for display
}

// --- Reporting Entities ---

export interface OrderLogItemProduct {
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderLogItem {
  orderId: string;
  createdAt: string;
  total: number;
  cashierUsername: string | null;
  items: OrderLogItemProduct[];
}

export interface DailySale {
  date: string;
  total: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  price: number;
}

export interface SaleReport {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  dailySales: DailySale[];
  topProducts: TopProduct[];
}