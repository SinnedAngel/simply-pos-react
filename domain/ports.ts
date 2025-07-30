import { UserSession, Product, StoredImage, Role, ListedUser, Order, SaleReport, Ingredient, UnitConversion, OrderLogItem } from './entities';

// --- APPLICATION PORTS (Interfaces) ---
// These interfaces define the contracts for dependencies that live in outer layers (e.g., data, services).
// Our domain use cases will depend on these abstractions, not on concrete implementations.
// This is key to the Dependency Inversion Principle.

export interface IProductRepository {
  getProducts(): Promise<Product[]>;
  getCategories(): Promise<string[]>;
  seedDatabase(): Promise<void>;
  updateProduct(product: Product): Promise<Product>;
  createProduct(productData: Omit<Product, 'id'>): Promise<Product>;
  deleteProduct(productId: number): Promise<void>;
  updateCategoryName(oldName: string, newName: string): Promise<void>;
  mergeCategories(sourceCategory: string, destinationCategory: string): Promise<void>;
}

export interface IAuthRepository {
  login(username: string, passwordHash:string): Promise<UserSession>;
  logout(): void;
  getSession(): UserSession | null;
  // User Management
  createUser(username: string, passwordHash: string, role: string): Promise<void>;
  getUsers(): Promise<ListedUser[]>;
  updateUser(user: Pick<ListedUser, 'id' | 'username' | 'role'>): Promise<void>;
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  // Role Management
  getRoles(): Promise<Role[]>;
  createRole(name: string): Promise<void>;
  updateRole(role: Role): Promise<void>;
  deleteRole(roleId: string): Promise<void>;
  // Permission Management
  getAllRolePermissions(): Promise<Record<string, string[]>>;
  updateRolePermissions(roleId: string, permissions: string[]): Promise<void>;
}

export interface IStorageRepository {
  listImages(bucket: string): Promise<StoredImage[]>;
  uploadImage(bucket: string, file: File): Promise<StoredImage>;
  deleteImage(bucket: string, imageName: string): Promise<void>;
}

export interface ISalesRepository {
    createOrder(order: Order, userId: string): Promise<void>;
    getSalesReport(startDate: string, endDate: string): Promise<SaleReport>;
    getOrderLog(startDate: string, endDate: string): Promise<OrderLogItem[]>;
}

export interface IIngredientRepository {
    getIngredients(): Promise<Ingredient[]>;
    createIngredient(name: string, stockUnit: string, initialStock: number): Promise<Ingredient>;
    updateIngredient(ingredient: Ingredient): Promise<Ingredient>;
    deleteIngredient(ingredientId: number): Promise<void>;
}

export interface IConversionRepository {
    getConversions(): Promise<UnitConversion[]>;
    createConversion(conversion: Omit<UnitConversion, 'id' | 'ingredientName'>): Promise<UnitConversion>;
    updateConversion(conversion: Omit<UnitConversion, 'ingredientName'>): Promise<UnitConversion>;
    deleteConversion(conversionId: number): Promise<void>;
}
