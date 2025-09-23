import React, { useState } from 'react';
import { Ingredient, PurchaseLogItem, UserSession } from '../../domain/entities';

interface LogPurchaseModalProps {
  onSave: (data: Omit<PurchaseLogItem, 'id' | 'createdAt' | 'userName' | 'ingredientName'> & { ingredientId: number; userId: string; createdAt?: string; }) => Promise<void>;
  onCancel: () => void;
  ingredients: Ingredient[];
  isLoadingIngredients: boolean;
  session: UserSession | null;
}

const LogPurchaseModal: React.FC<LogPurchaseModalProps> = ({ onSave, onCancel, ingredients, isLoadingIngredients, session }) => {
  const [ingredientId, setIngredientId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [totalCost, setTotalCost] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleIngredientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    setIngredientId(selectedId);
    const selectedIngredient = ingredients.find(i => i.id === selectedId);
    if (selectedIngredient) {
      setUnit(selectedIngredient.stockUnit);
    } else {
      setUnit('');
    }
  };

  const handleSave = async () => {
    setError('');
    if (!ingredientId || !unit.trim() || quantity === '' || totalCost === '' || !purchaseDate) {
      setError('Please fill in all required fields: Ingredient, Quantity, Unit, Total Cost, and Purchase Date.');
      return;
    }
    const quantityNum = Number(quantity);
    const costNum = Number(totalCost);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      setError('Total cost must be a non-negative number.');
      return;
    }
    if (!session?.id) {
        setError('Cannot log purchase without a valid user session.');
        return;
    }

    setIsSaving(true);
    try {
      const purchaseTimestamp = new Date(purchaseDate).toISOString();
      await onSave({
        ingredientId,
        quantityPurchased: quantityNum,
        unit,
        totalCost: costNum,
        supplier: supplier.trim() || null,
        notes: notes.trim() || null,
        userId: session.id,
        createdAt: purchaseTimestamp,
      });
      onCancel(); // Close modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
      <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Log New Purchase</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          
          <div>
            <label htmlFor="ingredient" className="block text-sm font-medium text-text-secondary mb-2">Ingredient *</label>
            <select id="ingredient" value={ingredientId} onChange={handleIngredientChange} disabled={isLoadingIngredients || isSaving}
              className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none">
              <option value="">{isLoadingIngredients ? 'Loading...' : 'Select an ingredient'}</option>
              {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-text-secondary mb-2">Quantity Purchased *</label>
              <input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} disabled={isSaving}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., 1000"/>
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-text-secondary mb-2">Unit *</label>
              <input id="unit" type="text" value={unit} onChange={e => setUnit(e.target.value)} disabled={isSaving}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., gram, kg, liter"/>
            </div>
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-text-secondary mb-2">Total Cost (Rp) *</label>
              <input id="cost" type="number" value={totalCost} onChange={e => setTotalCost(e.target.value === '' ? '' : Number(e.target.value))} disabled={isSaving}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., 150000"/>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="purchase-date" className="block text-sm font-medium text-text-secondary mb-2">Purchase Date *</label>
                <input id="purchase-date" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} disabled={isSaving}
                    className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none [color-scheme:dark]"/>
            </div>
            <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-text-secondary mb-2">Supplier (Optional)</label>
                <input id="supplier" type="text" value={supplier} onChange={e => setSupplier(e.target.value)} disabled={isSaving}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
            </div>
          </div>

           <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-secondary mb-2">Notes (Optional)</label>
            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={isSaving} rows={2}
              className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
          </div>

          {error && <p className="text-red-400 text-sm text-center bg-red-900/40 p-2 rounded-md">{error}</p>}

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {isSaving ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogPurchaseModal;