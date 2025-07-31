

import { IProductRepository } from '../ports';
import { Product } from '../entities';

// --- USE CASE: Managing Products ---
// This use case orchestrates fetching product data.
// It depends on the IProductRepository abstraction, not a concrete implementation.
export class ProductUseCases {
  constructor(private productRepository: IProductRepository) {}

  async getProducts(): Promise<Product[]> {
    return await this.productRepository.getProducts();
  }

  async getCategories(): Promise<string[]> {
    return await this.productRepository.getCategories();
  }

  async seedDatabase(): Promise<void> {
    await this.productRepository.seedDatabase();
  }

  async updateProduct(product: Product): Promise<Product> {
    if (!product.name || product.name.trim().length === 0) {
      throw new Error('Invalid product data. Name cannot be empty.');
    }
    if (product.isForSale) {
        if (product.price <= 0) {
            throw new Error('Invalid product data. Price must be a positive number for saleable items.');
        }
        if (!product.categories || product.categories.length === 0) {
            throw new Error('Invalid product data. At least one category is required for saleable items.');
        }
    }
    return await this.productRepository.updateProduct(product);
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    if (!productData.name || productData.name.trim().length === 0) {
      throw new Error('Invalid product data. Name cannot be empty.');
    }
    if (productData.isForSale) {
        if (productData.price <= 0) {
            throw new Error('Invalid product data. Price must be a positive number for saleable items.');
        }
        if (!productData.categories || productData.categories.length === 0) {
            throw new Error('Invalid product data. At least one category is required for saleable items.');
        }
    }
    return await this.productRepository.createProduct(productData);
  }

  async deleteProduct(productId: number): Promise<void> {
    if (!productId) {
      throw new Error('Product ID is required for deletion.');
    }
    await this.productRepository.deleteProduct(productId);
  }

  async updateCategoryName(oldName: string, newName: string): Promise<void> {
    if (!newName || newName.trim().length === 0) {
      throw new Error("New category name cannot be empty.");
    }
    if (oldName === newName) {
      throw new Error("New category name cannot be the same as the old one.");
    }
    await this.productRepository.updateCategoryName(oldName, newName);
  }

  async mergeCategories(sourceCategory: string, destinationCategory: string): Promise<void> {
    if (!sourceCategory || !destinationCategory) {
      throw new Error("Source and destination categories must be specified.");
    }
    if (sourceCategory === destinationCategory) {
      throw new Error("Cannot merge a category into itself.");
    }
    await this.productRepository.mergeCategories(sourceCategory, destinationCategory);
  }

  async restockPreparation(productId: number, quantityToAdd: number): Promise<void> {
    if (!productId || quantityToAdd <= 0) {
        throw new Error('Valid product ID and a positive quantity are required to restock.');
    }
    await this.productRepository.restockPreparation(productId, quantityToAdd);
  }
}