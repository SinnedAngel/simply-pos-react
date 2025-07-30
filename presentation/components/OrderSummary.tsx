
import React, { useState } from 'react';
import { Order, OrderItem } from '../../domain/entities';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';

interface OrderSummaryProps {
  order: Order;
  onRemoveItem: (productId: number) => void;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onCheckout: () => Promise<void>;
  canCheckout: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ order, onRemoveItem, onUpdateQuantity, onCheckout, canCheckout }) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      await onCheckout();
      // Success message is now handled by the parent component (PosApp)
    } catch (err) {
      // The parent component now shows an alert for failures.
      // We just need to ensure the loading state is reset.
      console.error("Checkout failed", err);
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-surface-sidebar text-text-primary">
      <h2 className="text-2xl font-bold border-b border-gray-700 pb-4 mb-4">Current Order</h2>
      
      {order.items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-text-secondary">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="font-semibold">Your cart is empty</p>
          <p className="text-sm">Select products to add them to the order.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto -mr-4 pr-4">
          {order.items.map(item => (
            <OrderItemRow key={item.id} item={item} onRemoveItem={onRemoveItem} onUpdateQuantity={onUpdateQuantity} />
          ))}
        </div>
      )}

      <div className="border-t border-gray-700 pt-6 mt-4">
        <div className="space-y-2 text-md">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Tax</span>
            <span>Rp {order.tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-bold text-2xl text-text-primary mt-2">
            <span>Total</span>
            <span>Rp {order.total.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          disabled={order.items.length === 0 || isCheckingOut || !canCheckout}
          className="w-full mt-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          title={!canCheckout ? "You do not have permission to perform sales." : undefined}
        >
          {isCheckingOut && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
          {isCheckingOut ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  );
};


const OrderItemRow: React.FC<{item: OrderItem, onRemoveItem: Function, onUpdateQuantity: Function}> = ({ item, onRemoveItem, onUpdateQuantity }) => {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover mr-4" />
                <div>
                    <p className="font-semibold text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-secondary">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface-card rounded-full">
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-text-secondary hover:text-white transition-colors">
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-sm font-semibold">{item.quantity}</span>
                     <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1.5 text-text-secondary hover:text-white transition-colors">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={() => onRemoveItem(item.id)} className="p-1.5 text-red-500 hover:text-red-400">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}

export default OrderSummary;
