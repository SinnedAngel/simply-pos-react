import { useState, useCallback } from 'react';
import { Order, Product } from '../../domain/entities';
import { OrderUseCases } from '../../domain/use-cases/OrderUseCases';

export const useOrder = (useCases: OrderUseCases) => {
  const [order, setOrder] = useState<Order>(useCases.getState());

  const addItem = useCallback((product: Product) => {
    const newOrderState = useCases.addItem(product);
    setOrder(newOrderState);
  }, [useCases]);

  const removeItem = useCallback((productId: number) => {
    const newOrderState = useCases.removeItem(productId);
    setOrder(newOrderState);
  }, [useCases]);

  const updateItemQuantity = useCallback((productId: number, newQuantity: number) => {
    const newOrderState = useCases.updateItemQuantity(productId, newQuantity);
    setOrder(newOrderState);
  }, [useCases]);

  const clearOrder = useCallback(() => {
    const newOrderState = useCases.clearOrder();
    setOrder(newOrderState);
  }, [useCases]);

  const setOrderState = useCallback((newOrder: Order) => {
      // This is a new function to directly set the order state from an external source (like an open table)
      useCases.clearOrder(); // First clear internal state
      newOrder.items.forEach(item => {
          // Re-add items to ensure the internal state of the use case is consistent
          for (let i = 0; i < item.quantity; i++) {
              useCases.addItem(item);
          }
      });
      setOrder(useCases.getState());
  }, [useCases]);

  return { order, addItem, removeItem, updateItemQuantity, clearOrder, setOrderState };
};