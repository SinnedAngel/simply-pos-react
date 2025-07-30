
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, RpcIngredient } from '../types';
import { Ingredient } from '../domain/entities';
import { IIngredientRepository } from '../domain/ports';

// --- ADAPTER: Ingredient Repository ---
// This class implements the IIngredientRepository port for inventory management.
export class IngredientRepository implements IIngredientRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getIngredients(): Promise<Ingredient[]> {
    const { data, error } = await this.supabase.rpc('get_all_ingredients');
    if (error) {
        console.error('Error fetching ingredients:', error);
        throw new Error(`Failed to get ingredients: ${error.message}`);
    }
    
    return ((data as unknown as RpcIngredient[]) ?? []).map((i: RpcIngredient) => ({
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
      throw new Error(`Failed to create ingredient: ${error.message}`);
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
    
    const typedIngredient = newIngredient as Database['public']['Tables']['ingredients']['Row'];

    return {
        id: typedIngredient.id,
        name: typedIngredient.name,
        stockLevel: typedIngredient.stock_level,
        stockUnit: typedIngredient.stock_unit,
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
        throw new Error(`Failed to update ingredient: ${error.message}`);
      }
      return ingredient;
  }

  async deleteIngredient(ingredientId: number): Promise<void> {
    const { error } = await this.supabase.rpc('delete_ingredient', { p_id: ingredientId });
    if (error) {
        console.error('Error deleting ingredient:', error);
        throw new Error(`Failed to delete ingredient: ${error.message}`);
    }
  }
}
