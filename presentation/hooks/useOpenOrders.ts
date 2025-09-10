import { useState, useEffect, useCallback } from 'react';
import { OpenOrder, Order } from '../../domain/entities';
import { SalesUseCases } from '../../domain/use-cases';

export const useOpenOrders = (useCases: SalesUseCases) => {
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getOpenOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await useCases.getOpenOrders();
      setOpenOrders(fetchedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching open orders.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    getOpenOrders();
  }, [getOpenOrders]);

  const saveOpenOrder = async (tableNumber: string, order: Order, userId: string) => {
    await useCases.saveOpenOrder(tableNumber, order, userId);
    await getOpenOrders(); // Refresh the list
  };
  
  const closeOpenOrder = async (tableNumber: string) => {
    await useCases.closeOpenOrder(tableNumber);
    await getOpenOrders(); // Refresh the list
  };

  return { openOrders, isLoading, error, getOpenOrders, saveOpenOrder, closeOpenOrder };
};