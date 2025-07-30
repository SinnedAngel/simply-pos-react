
import { useState, useEffect, useCallback } from 'react';
import { Product } from '../../domain/entities';
import { ProductUseCases } from '../../domain/use-cases/ProductUseCases';

export const useProducts = (useCases: ProductUseCases) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbEmpty, setIsDbEmpty] = useState<boolean>(false);
  const [schemaError, setSchemaError] = useState<boolean>(false);

  const fetchProductsAndCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsDbEmpty(false);
      setSchemaError(false);

      const [fetchedProducts, fetchedCategories] = await Promise.all([
        useCases.getProducts(),
        useCases.getCategories()
      ]);

      if (fetchedProducts.length === 0) {
        // This checks if the products table exists but is just empty.
        // The check for a non-existent table is now handled in App.tsx
        setIsDbEmpty(true);
      }

      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
    } catch (err) {
      if (err instanceof Error) {
        // This is a specific check for a missing table/function in Postgres.
        if(err.message.includes('relation "public.products" does not exist') || err.message.includes('function public.get_distinct_categories() does not exist')) {
            setSchemaError(true);
            setError("Database schema is not initialized.");
        } else {
            setError(err.message);
        }
      } else {
        setError("An unknown error occurred while fetching data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  return { products, categories, isLoading, error, isDbEmpty, schemaError, refetch: fetchProductsAndCategories };
};
