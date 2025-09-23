import { useState, useCallback } from 'react';
import { PurchaseLogItem } from '../../domain/entities';
import { SalesUseCases, InventoryUseCases } from '../../domain/use-cases';
import { useReporting } from './useReporting'; // Reuse date logic

export const usePurchaseLog = (salesUseCases: SalesUseCases, inventoryUseCases: InventoryUseCases) => {
  const [log, setLog] = useState<PurchaseLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { getDatesForRange } = useReporting(salesUseCases); // Get the date calculation utility

  const fetchLog = useCallback(async (range: { startDate: string, endDate: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLog = await salesUseCases.getPurchaseLog(range.startDate, range.endDate);
      setLog(fetchedLog);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching the purchase log.');
    } finally {
      setIsLoading(false);
    }
  }, [salesUseCases]);
  
  const createPurchase = async (purchaseData: Omit<PurchaseLogItem, 'id'|'createdAt'|'userName'|'ingredientName'> & { ingredientId: number; userId: string; createdAt?: string; }) => {
    // The use-case will perform validation.
    // Errors will be thrown and should be caught by the calling component.
    await inventoryUseCases.logPurchase(purchaseData);
    // After a successful purchase, refetch the log for the current period.
    // We assume the user wants to see the new entry, so we fetch for today.
    const todayRange = getDatesForRange('today');
    await fetchLog(todayRange);
  };


  return { log, isLoading, error, fetchLog, createPurchase };
};