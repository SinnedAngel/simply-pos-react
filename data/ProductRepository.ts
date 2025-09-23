import { Product, RecipeItem } from '../domain/entities';
import { IProductRepository } from '../domain/ports';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, RpcProduct, RpcRecipeParamItem } from '../types';
import { seedData } from './seed';

// --- ADAPTER: Data Repository ---
// This class implements the IProductRepository port. It adapts our data source (Supabase)
// to the interface required by our application's use cases.
export class ProductRepository implements IProductRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase.rpc('get_products_with_categories');

    if (error) {
      console.error("Error fetching products from Supabase:", error);
      throw new Error(`Error fetching products: ${error.message}`);
    }

    if (!data) return [];
    
    // The data from rpc is now strongly typed
    const productsData = data as RpcProduct[];

    return productsData.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.image_url,
      categories: p.categories || [],
      recipe: p.recipe || [],
      isForSale: p.is_for_sale,
      stockLevel: p.stock_level,
      stockUnit: p.stock_unit,
    }));
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabase.rpc('get_all_categories');

    if (error) {
      console.error('Error fetching categories via RPC:', error);
      throw new Error(`Error fetching categories: ${error.message}`);
    }
    
    if (Array.isArray(data)) {
      return data.map((c) => c.name);
    }
    
    return [];
  }

  async seedDatabase(): Promise<void> {
    // This seeds products and categories.
    const { error: productError } = await this.supabase.rpc('seed_initial_products', { products_data: seedData as any });

    if (productError) {
      console.error('Error seeding products via RPC:', productError);
      const readableError = `Failed to seed products. Supabase returned: ${productError.message} (details: ${productError.details || 'N/A'})`;
      throw new Error(readableError);
    }

    // This seeds the ingredients and links them to the products just created.
    const { error: inventoryError } = await this.supabase.rpc('seed_inventory_and_recipes');

     if (inventoryError) {
      console.error('Error seeding inventory via RPC:', inventoryError);
      const readableError = `Failed to seed inventory. Supabase returned: ${inventoryError.message} (details: ${inventoryError.details || 'N/A'})`;
      throw new Error(readableError);
    }
  }

  private mapRecipeToRpc(recipe: RecipeItem[]): RpcRecipeParamItem[] {
    return recipe.map(item => {
        if (item.type === 'ingredient') {
            return { ingredientId: item.ingredientId, quantity: item.quantity, unit: item.unit };
        }
        return { productId: item.productId, quantity: item.quantity, unit: item.unit };
    });
  }

  async updateProduct(product: Product): Promise<Product> {
    const productUpdate: Database['public']['Tables']['products']['Update'] = {
        name: product.name,
        price: product.price,
        image_url: product.imageUrl,
        is_for_sale: product.isForSale,
        stock_level: product.stockLevel,
        stock_unit: product.stockUnit,
    };
    // 1. Update the product details in the 'products' table.
    const { error: productError } = await this.supabase
      .from('products')
      .update(productUpdate)
      .eq('id', product.id);

    if (productError) {
      console.error('Error updating product details:', productError);
      throw new Error(`Error updating product: ${productError.message}`);
    }

    // 2. Update the product's categories using the RPC.
    const { error: categoryError } = await this.supabase.rpc('set_product_categories', {
        p_product_id: product.id,
        p_category_names: product.categories,
    });
    
    if (categoryError) {
        console.error('Error setting product categories:', categoryError);
        throw new Error(`Product updated, but failed to set categories: ${categoryError.message}`);
    }
    
    // 3. Update the product's recipe using the RPC.
    const recipeToSave = this.mapRecipeToRpc(product.recipe);
    const { error: recipeError } = await this.supabase.rpc('set_product_recipe', {
        p_product_id: product.id,
        p_recipe: recipeToSave,
    });

    if (recipeError) {
        console.error('Error setting product recipe:', recipeError);
        throw new Error(`Product updated, but failed to set recipe: ${recipeError.message}`);
    }

    return { ...product }; // Return the full product object passed in.
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    // Generate new ID by finding the current max and adding 1.
    const { data: maxIdData, error: maxIdError } = await this.supabase
      .from('products')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (maxIdError && maxIdError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Error fetching max product id:', maxIdError);
      throw new Error(`Could not determine new product ID: ${maxIdError.message}`);
    }

    const newId = (maxIdData?.id ?? 0) + 1;

    // 1. Insert the new product into the 'products' table.
    const newProductRecord: Database['public']['Tables']['products']['Insert'] = {
      id: newId,
      name: productData.name,
      price: productData.price,
      image_url: productData.imageUrl,
      is_for_sale: productData.isForSale,
      stock_level: productData.stockLevel,
      stock_unit: productData.stockUnit,
    };

    const { error: insertError } = await this.supabase
      .from('products')
      .insert([newProductRecord]);

    if (insertError) {
      console.error('Error creating product:', insertError);
      throw new Error(`Error creating product: ${insertError.message}`);
    }

    // 2. Set the product's categories using the RPC.
     const { error: categoryError } = await this.supabase.rpc('set_product_categories', {
        p_product_id: newId,
        p_category_names: productData.categories,
    });

    if (categoryError) {
        console.error('Error setting product categories:', categoryError);
        throw new Error(`Product created, but failed to set categories: ${categoryError.message}`);
    }

     // 3. Set the product's recipe using the RPC.
    const recipeToSave = this.mapRecipeToRpc(productData.recipe);
    const { error: recipeError } = await this.supabase.rpc('set_product_recipe', {
        p_product_id: newId,
        p_recipe: recipeToSave,
    });

    if (recipeError) {
        console.error('Error setting product recipe:', recipeError);
        throw new Error(`Product created, but failed to set recipe: ${recipeError.message}`);
    }

    const finalProduct: Product = { ...productData, id: newId };
    return finalProduct;
  }

  async deleteProduct(productId: number): Promise<void> {
    // RLS and cascading deletes on the DB will handle removing entries
    // from product_categories and product_recipe_items tables.
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error('Error deleting product:', error);
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }
  
  async updateCategoryName(oldName: string, newName: string): Promise<void> {
    const { error } = await this.supabase.rpc('update_category_name', {
      p_old_name: oldName,
      p_new_name: newName,
    });
    if (error) {
      console.error('Error updating category name:', error);
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  async mergeCategories(sourceCategory: string, destinationCategory: string): Promise<void> {
    const { error } = await this.supabase.rpc('merge_categories', {
      p_source_category_name: sourceCategory,
      p_destination_category_name: destinationCategory,
    });
    if (error) {
      console.error('Error merging categories:', error);
      throw new Error(`Failed to merge categories: ${error.message}`);
    }
  }

  async restockPreparation(productId: number, quantityToAdd: number): Promise<void> {
    const { error } = await this.supabase.rpc('restock_preparation', {
        p_product_id: productId,
        p_quantity_to_add: quantityToAdd,
    });

    if (error) {
        console.error('Error restocking preparation:', error);
        throw new Error(`Failed to restock preparation: ${error.message}`);
    }
  }
}