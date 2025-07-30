
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

  return { order, addItem, removeItem, updateItemQuantity, clearOrder };
};
