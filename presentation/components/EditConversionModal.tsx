
import React, { useState } from 'react';
import { UnitConversion, Ingredient } from '../../domain/entities';

interface EditConversionModalProps {
  conversion: UnitConversion | 'new';
  ingredients: Ingredient[];
  isLoadingIngredients: boolean;
  onSave: (data: Omit<UnitConversion, 'id' | 'ingredientName'> | Omit<UnitConversion, 'ingredientName'>) => Promise<void>;
  onCancel: () => void;
}

const EditConversionModal: React.FC<EditConversionModalProps> = ({ conversion, ingredients, isLoadingIngredients, onSave, onCancel }) => {
    const isNew = conversion === 'new';
    const data = isNew ? null : conversion;

    const [fromUnit, setFromUnit] = useState(data?.fromUnit ?? '');
    const [toUnit, setToUnit] = useState(data?.toUnit ?? '');
    const [factor, setFactor] = useState(data?.factor ?? 1);
    const [ingredientId, setIngredientId] = useState<number | null>(data?.ingredientId ?? null);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');
        setIsSaving(true);
        const saveData = {
            fromUnit,
            toUnit,
            factor,
            ingredientId,
        };
        try {
            if (isNew) {
                await onSave(saveData);
            } else {
                await onSave({ ...saveData, id: data!.id });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
            <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-text-primary mb-6">{isNew ? 'Add' : 'Edit'} Conversion Rule</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="from-unit" className="block text-sm font-medium text-text-secondary mb-2">From Unit</label>
                            <input id="from-unit" type="text" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}
                                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., teaspoon"/>
                        </div>
                        <div>
                            <label htmlFor="to-unit" className="block text-sm font-medium text-text-secondary mb-2">To Unit</label>
                            <input id="to-unit" type="text" value={toUnit} onChange={(e) => setToUnit(e.target.value)}
                                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., gram"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="factor" className="block text-sm font-medium text-text-secondary mb-2">Conversion Factor</label>
                        <input id="factor" type="number" value={factor} onChange={(e) => setFactor(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
                        <p className="text-xs text-text-secondary mt-1">How many 'To Units' are in one 'From Unit'?</p>
                    </div>
                    <div>
                        <label htmlFor="ingredient-specific" className="block text-sm font-medium text-text-secondary mb-2">Ingredient Specific (Optional)</label>
                        <select id="ingredient-specific" value={ingredientId ?? ''} onChange={(e) => setIngredientId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                            disabled={isLoadingIngredients}>
                            <option value="">Generic (applies to all)</option>
                            {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-text-secondary mt-1">Apply this rule only to a specific ingredient (e.g., a teaspoon of sugar vs. a teaspoon of flour).</p>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditConversionModal;
