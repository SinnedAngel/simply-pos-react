import { IIngredientRepository } from '../ports';
import { Ingredient, PurchaseLogItem } from '../entities';

// --- USE CASE: Managing Inventory ---
// This use case orchestrates all inventory-related logic.
export class InventoryUseCases {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async getIngredients(): Promise<Ingredient[]> {
    return this.ingredientRepository.getIngredients();
  }

  async createIngredient(name: string, stockUnit: string, initialStock: number): Promise<Ingredient> {
    if (!name.trim() || !stockUnit.trim()) {
      throw new Error('Ingredient name and stock unit are required.');
    }
    if (initialStock < 0) {
      throw new Error('Initial stock cannot be negative.');
    }
    return this.ingredientRepository.createIngredient(name, stockUnit, initialStock);
  }
  
  async updateIngredient(ingredient: Ingredient): Promise<Ingredient> {
    if (!ingredient.name.trim() || !ingredient.stockUnit.trim()) {
      throw new Error('Ingredient name and stock unit are required.');
    }
     if (ingredient.stockLevel < 0) {
      throw new Error('Stock level cannot be negative.');
    }
    return this.ingredientRepository.updateIngredient(ingredient);
  }

  async deleteIngredient(ingredientId: number): Promise<void> {
    if (!ingredientId) {
      throw new Error('Ingredient ID is required for deletion.');
    }
    return this.ingredientRepository.deleteIngredient(ingredientId);
  }

  async logPurchase(purchaseData: Omit<PurchaseLogItem, 'id' | 'createdAt' | 'userName' | 'ingredientName'> & { ingredientId: number; userId: string; createdAt?: string; }): Promise<void> {
    if (!purchaseData.ingredientId || purchaseData.quantityPurchased <= 0 || purchaseData.totalCost < 0 || !purchaseData.unit || !purchaseData.userId) {
      throw new Error('Invalid purchase data. Please check all fields.');
    }
    return this.ingredientRepository.logPurchase(purchaseData);
  }
}