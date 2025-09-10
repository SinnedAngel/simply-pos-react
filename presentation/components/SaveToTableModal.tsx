import React, { useState } from 'react';
import { OpenOrder } from '../../domain/entities';

interface SaveToTableModalProps {
  onSave: (tableNumber: string) => Promise<void>;
  onCancel: () => void;
  openOrders: OpenOrder[];
}

const SaveToTableModal: React.FC<SaveToTableModalProps> = ({ onSave, onCancel, openOrders }) => {
    const [tableNumber, setTableNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const trimmedTable = tableNumber.trim();
        if (!trimmedTable) {
            setError('Table number cannot be empty.');
            return;
        }
        if (openOrders.some(o => o.tableNumber.toLowerCase() === trimmedTable.toLowerCase())) {
            setError(`Table "${trimmedTable}" already has an open order. Choose a different table or update the existing one.`);
            return;
        }

        setError('');
        setIsSaving(true);
        try {
            await onSave(trimmedTable);
            // On success, parent will close the modal
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
            <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-text-primary mb-6">Save to Table</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="table-number" className="block text-sm font-medium text-text-secondary mb-2">Table Number or Name</label>
                            <input
                                id="table-number"
                                type="text"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                                placeholder="e.g., 14 or Patio 2"
                                autoFocus
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSaving || !tableNumber} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                            {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                            {isSaving ? 'Saving...' : 'Save Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveToTableModal;