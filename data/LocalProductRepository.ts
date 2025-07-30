
import { Product } from '../domain/entities';
import { IProductRepository } from '../domain/ports';
import { seedData } from './seed';

// --- ADAPTER: Local Data Repository ---
// This class implements the IProductRepository port for an offline/demo mode.
// It uses the local seedData file instead of making a network request.
export class LocalProductRepository implements IProductRepository {
  async getProducts(): Promise<Product[]> {
    // Simulate the async nature of a real data fetch
    return Promise.resolve(seedData);
  }

  async getCategories(): Promise<string[]> {
    const categories = new Set(seedData.flatMap(p => p.categories));
    // Simulate async and return a sorted list
    return Promise.resolve(Array.from(categories).sort());
  }

  async seedDatabase(): Promise<void> {
    // Seeding is not applicable in local demo mode.
    console.warn("Attempted to seed database in Demo Mode. Operation skipped.");
    return Promise.resolve();
  }

  async updateProduct(product: Product): Promise<Product> {
    console.warn("Attempted to update a product in Demo Mode. This change will not be persisted.");
    // In a real local implementation, you might update an in-memory array.
    // For this demo, we'll just return the product as if it were updated.
    return Promise.resolve(product);
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    console.warn("Attempted to create a product in Demo Mode. This change will not be persisted.");
    // Create a mock product to return.
    const newProduct: Product = {
      id: Math.max(...seedData.map(p => p.id), 0) + 1,
      ...productData,
    };
    return Promise.resolve(newProduct);
  }

  async deleteProduct(productId: number): Promise<void> {
    console.warn(`Attempted to delete product with ID ${productId} in Demo Mode. This change will not be persisted.`);
    return Promise.resolve();
  }

  async updateCategoryName(oldName: string, newName: string): Promise<void> {
    console.warn(`Attempted to rename category from ${oldName} to ${newName} in Demo Mode. This change will not be persisted.`);
    return Promise.resolve();
  }

  async mergeCategories(sourceCategory: string, destinationCategory: string): Promise<void> {
    console.warn(`Attempted to merge category ${sourceCategory} into ${destinationCategory} in Demo Mode. This change will not be persisted.`);
    return Promise.resolve();
  }
}
