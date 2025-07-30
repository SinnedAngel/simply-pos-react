
import { useState, useEffect, useCallback } from 'react';
import { Ingredient } from '../../domain/entities';
import { InventoryUseCases } from '../../domain/use-cases';

export const useInventory = (useCases: InventoryUseCases) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedIngredients = await useCases.getIngredients();
      setIngredients(fetchedIngredients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching ingredients.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const createIngredient = async (name: string, stockUnit: string, initialStock: number) => {
    const newIngredient = await useCases.createIngredient(name, stockUnit, initialStock);
    setIngredients(prev => [...prev, newIngredient].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const updateIngredient = async (ingredient: Ingredient) => {
    const updatedIngredient = await useCases.updateIngredient(ingredient);
    setIngredients(prev => prev.map(i => i.id === updatedIngredient.id ? updatedIngredient : i));
  };
  
  const deleteIngredient = async (ingredientId: number) => {
    await useCases.deleteIngredient(ingredientId);
    setIngredients(prev => prev.filter(i => i.id !== ingredientId));
  };


  return { ingredients, isLoading, error, refetch: fetchIngredients, createIngredient, updateIngredient, deleteIngredient };
};
