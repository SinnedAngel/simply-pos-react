
import React, { useState } from 'react';
import { Product, Ingredient } from '../../domain/entities';

interface RestockModalProps {
  item: Product | Ingredient;
  onSave: (item: Product | Ingredient, quantityToAdd: number) => Promise<void>;
  onCancel: () => void;
}

const RestockModal: React.FC<RestockModalProps> = ({ item, onSave, onCancel }) => {
    const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const quantity = Number(quantityToAdd);
        if (isNaN(quantity) || quantity <= 0) {
            setError('Please enter a positive number to add.');
            return;
        }
        
        setError('');
        setIsSaving(true);
        try {
            await onSave(item, quantity);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
              <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
                 <h2 className="text-2xl font-bold text-text-primary mb-2">Restock Item</h2>
                 <p className="text-text-secondary mb-6">Add to the stock level for <span className="font-semibold text-text-primary">{item.name}</span>.</p>
                 
                 <div className="space-y-4">
                    <div>
                        <span className="block text-sm font-medium text-text-secondary">Current Stock</span>
                        <p className="text-lg font-semibold text-text-primary">{item.stockLevel?.toLocaleString() ?? 0} {item.stockUnit}</p>
                    </div>
                     <div>
                        <label htmlFor="quantity-to-add" className="block text-sm font-medium text-text-secondary mb-2">Quantity to Add</label>
                        <input 
                            id="quantity-to-add" 
                            type="number"
                            value={quantityToAdd}
                            onChange={(e) => setQuantityToAdd(e.target.value === '' ? '' : Number(e.target.value))} 
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                            placeholder="e.g., 500"
                            autoFocus
                        />
                    </div>
                 </div>
                 
                 {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                 
                 <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {isSaving ? 'Saving...' : 'Confirm Restock'}
                    </button>
                 </div>
              </div>
         </div>
    );
};

export default RestockModal;
