
import { useState, useEffect, useCallback } from 'react';
import { UnitConversion } from '../../domain/entities';
import { ConversionUseCases } from '../../domain/use-cases';

export const useConversions = (useCases: ConversionUseCases) => {
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedConversions = await useCases.getConversions();
      setConversions(fetchedConversions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching conversions.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchConversions();
  }, [fetchConversions]);

  const createConversion = async (conversionData: Omit<UnitConversion, 'id' | 'ingredientName'>) => {
    const newConversion = await useCases.createConversion(conversionData);
    setConversions(prev => [...prev, newConversion].sort((a,b) => (a.fromUnit+a.toUnit).localeCompare(b.fromUnit+b.toUnit)));
  };

  const updateConversion = async (conversion: Omit<UnitConversion, 'ingredientName'>) => {
    const updatedConversion = await useCases.updateConversion(conversion);
     // Refetch to get the potentially updated ingredient name
    await fetchConversions();
  };
  
  const deleteConversion = async (conversionId: number) => {
    await useCases.deleteConversion(conversionId);
    setConversions(prev => prev.filter(c => c.id !== conversionId));
  };


  return { conversions, isLoading, error, refetch: fetchConversions, createConversion, updateConversion, deleteConversion };
};
