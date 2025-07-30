
import React, { useState } from 'react';
import { InventoryUseCases } from '../../domain/use-cases';
import { useInventory } from '../hooks/useInventory';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ingredient } from '../../domain/entities';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmModal from '../components/ConfirmModal';
import EditIngredientModal from '../components/EditIngredientModal';

interface InventoryPageProps {
  useCases: InventoryUseCases;
}

const InventoryPage: React.FC<InventoryPageProps> = ({ useCases }) => {
  const { ingredients, isLoading, error, refetch, createIngredient, deleteIngredient, updateIngredient } = useInventory(useCases);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newStockUnit, setNewStockUnit] = useState('');
  const [newStock, setNewStock] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Modal state
  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(null);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsCreating(true);
    try {
      await createIngredient(newName, newStockUnit, newStock);
      setCreateSuccess(`Successfully created ingredient "${newName}".`);
      setNewName('');
      setNewStockUnit('');
      setNewStock(0);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSave = async (ingredient: Ingredient) => {
    setPageError(null);
    try {
        await updateIngredient(ingredient);
        setIngredientToEdit(null);
    } catch (err) {
        // rethrow for the modal to catch and display
        throw err;
    }
  };

  const handleDelete = async () => {
    if (!ingredientToDelete) return;
    setPageError(null);
    try {
      await deleteIngredient(ingredientToDelete.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setPageError(`Failed to delete "${ingredientToDelete.name}": ${msg}. It might be used in a product recipe.`);
    } finally {
      setIngredientToDelete(null);
    }
  };
  
  const renderContent = () => {
    if (isLoading) return <LoadingSpinner message="Loading inventory..." />;
    if (error && ingredients.length === 0) return <p className="text-red-400 text-center py-8">{error}</p>;
    if (ingredients.length === 0) {
        return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">No ingredients found. Add one to get started.</div>
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface-card rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-main">
                <tr>
                  <th className="p-4 font-semibold text-sm">Ingredient Name</th>
                  <th className="p-4 font-semibold text-sm">Stock Level</th>
                  <th className="p-4 font-semibold text-sm">Stock Unit</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                    <td className="p-4 font-medium text-text-primary">{ing.name}</td>
                    <td className="p-4 text-text-secondary">{ing.stockLevel}</td>
                    <td className="p-4 text-text-secondary">{ing.stockUnit}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setIngredientToEdit(ing)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Ingredient">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setIngredientToDelete(ing)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Ingredient">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
            {ingredients.map(ing => (
                <div key={ing.id} className="bg-surface-card rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-text-primary">{ing.name}</h3>
                            <p className="text-sm text-text-secondary mt-1">
                                Stock: <span className="font-bold text-text-primary">{ing.stockLevel}</span> {ing.stockUnit}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIngredientToEdit(ing)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Ingredient">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIngredientToDelete(ing)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Ingredient">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </>
    );
  };


  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      {ingredientToEdit && <EditIngredientModal ingredient={ingredientToEdit} onSave={handleEditSave} onCancel={() => setIngredientToEdit(null)} />}
      {ingredientToDelete && (
        <ConfirmModal
          title="Delete Ingredient"
          message={`Are you sure you want to delete "${ingredientToDelete.name}"? This action cannot be undone and might fail if the ingredient is used in a product's recipe.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setIngredientToDelete(null)}
        />
      )}

      {/* --- Create Ingredient Form --- */}
      <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Add New Ingredient</h2>
        <p className="text-text-secondary mb-6">Add a new raw material or ingredient to track in your inventory.</p>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
              <label htmlFor="new-name" className="block text-sm font-medium text-text-secondary mb-2">Name</label>
              <input id="new-name" type="text" value={newName} onChange={e => setNewName(e.target.value)} disabled={isCreating} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., Coffee Beans" required />
            </div>
             <div>
              <label htmlFor="new-unit" className="block text-sm font-medium text-text-secondary mb-2">Stock Unit</label>
              <input id="new-unit" type="text" value={newStockUnit} onChange={e => setNewStockUnit(e.target.value)} disabled={isCreating} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., gram, ml, pcs" required />
            </div>
             <div>
              <label htmlFor="new-stock" className="block text-sm font-medium text-text-secondary mb-2">Initial Stock</label>
              <input id="new-stock" type="number" value={newStock} onChange={e => setNewStock(Number(e.target.value))} disabled={isCreating} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" required />
            </div>
          </div>
           {createError && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{createError}</p>}
           {createSuccess && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-md">{createSuccess}</p>}
          <div className="pt-2">
             <button type="submit" disabled={isCreating} className="w-full mt-2 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isCreating && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
              {isCreating ? 'Adding...' : 'Add Ingredient'}
            </button>
          </div>
        </form>
      </div>
      
      {pageError && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{pageError}</p>}
      
      {renderContent()}

    </div>
  );
};

export default InventoryPage;
