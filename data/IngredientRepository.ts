import { SupabaseClient } from '@supabase/supabase-js';
import { Database, RpcIngredient } from '../types';
import { Ingredient, PurchaseLogItem } from '../domain/entities';
import { IIngredientRepository } from '../domain/ports';

// --- ADAPTER: Ingredient Repository ---
// This class implements the IIngredientRepository port for inventory management.
export class IngredientRepository implements IIngredientRepository {
  constructor(private supabase: SupabaseClient<Database>) {}
  
  private getErrorMessage(error: any, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && error.message) {
      let message = String(error.message);
      if (error.details) {
        message += ` Details: ${String(error.details)}`;
      }
      if (error.hint) {
        message += ` Hint: ${String(error.hint)}`;
      }
      return message;
    }
    return defaultMessage;
  }

  async getIngredients(): Promise<Ingredient[]> {
    const { data, error } = await this.supabase.rpc('get_all_ingredients');
    if (error) {
        console.error('Error fetching ingredients:', error);
        throw new Error(`Failed to get ingredients: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
    
    return ((data as RpcIngredient[]) ?? []).map((i: RpcIngredient) => ({
        id: i.id,
        name: i.name,
        stockLevel: i.stock_level,
        stockUnit: i.stock_unit,
    }));
  }

  async createIngredient(name: string, stockUnit: string, initialStock: number): Promise<Ingredient> {
    const { error } = await this.supabase.rpc('create_ingredient', {
      p_name: name,
      p_stock_unit: stockUnit,
      p_initial_stock: initialStock,
    });
    if (error) {
      if (error.message.includes('duplicate key value violates unique constraint "ingredients_name_key"')) {
        throw new Error(`Ingredient "${name}" already exists.`);
      }
      console.error('Error creating ingredient:', error);
      throw new Error(`Failed to create ingredient: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
    // We need to fetch the created ingredient to get its ID
    const { data: newIngredient, error: fetchError } = await this.supabase
        .from('ingredients')
        .select('*')
        .eq('name', name)
        .single();
    
    if(fetchError || !newIngredient) {
        throw new Error('Ingredient was created, but failed to fetch it back.');
    }
    
    return {
        id: newIngredient.id,
        name: newIngredient.name,
        stockLevel: newIngredient.stock_level,
        stockUnit: newIngredient.stock_unit,
    };
  }
  
  async updateIngredient(ingredient: Ingredient): Promise<Ingredient> {
      const { error } = await this.supabase.rpc('update_ingredient', {
          p_id: ingredient.id,
          p_name: ingredient.name,
          p_stock_unit: ingredient.stockUnit,
          p_stock_level: ingredient.stockLevel,
      });

      if (error) {
        if (error.message.includes('duplicate key value violates unique constraint "ingredients_name_key"')) {
            throw new Error(`Ingredient name "${ingredient.name}" already exists.`);
        }
        console.error('Error updating ingredient:', error);
        throw new Error(`Failed to update ingredient: ${this.getErrorMessage(error, 'Unknown error')}`);
      }
      return ingredient;
  }

  async deleteIngredient(ingredientId: number): Promise<void> {
    const { error } = await this.supabase.rpc('delete_ingredient', { p_id: ingredientId });
    if (error) {
        console.error('Error deleting ingredient:', error);
        throw new Error(`Failed to delete ingredient: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
  }

  async logPurchase(data: Omit<PurchaseLogItem, 'id' | 'createdAt' | 'userName' | 'ingredientName'> & { ingredientId: number; userId: string; createdAt?: string; }): Promise<void> {
    const { error } = await this.supabase.rpc('log_purchase', {
      p_ingredient_id: data.ingredientId,
      p_quantity: data.quantityPurchased,
      p_unit: data.unit,
      p_total_cost: data.totalCost,
      p_user_id: data.userId,
      p_supplier: data.supplier || undefined,
      p_notes: data.notes || undefined,
      p_created_at: data.createdAt || undefined,
    });

    if (error) {
      console.error('Error logging purchase:', error);
      throw new Error(`Failed to log purchase: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
  }
}