
import React, { useState, useMemo } from 'react';
import { InventoryUseCases, ProductUseCases } from '../../domain/use-cases';
import { useInventory } from '../hooks/useInventory';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ingredient, Product } from '../../domain/entities';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmModal from '../components/ConfirmModal';
import EditStockItemModal from '../components/EditIngredientModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { PlusCircleIcon } from '../components/icons/PlusCircleIcon';
import RestockModal from '../components/RestockModal';
import AddIngredientModal from '../components/AddIngredientModal';


interface InventoryPageProps {
  useCases: InventoryUseCases;
  productUseCases: ProductUseCases;
  onAddPreparation: () => void;
  // Props passed down from PosApp
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;
  refetchProducts: () => Promise<void>;
}

type InventoryTab = 'ingredients' | 'preparations';

const InventoryPage: React.FC<InventoryPageProps> = ({
  useCases,
  productUseCases,
  onAddPreparation,
  products,
  isLoadingProducts,
  productsError,
  refetchProducts
}) => {
  const { ingredients, isLoading: isLoadingIngredients, error: ingredientsError, createIngredient, deleteIngredient, updateIngredient, refetch: refetchIngredients } = useInventory(useCases);
  
  const [activeTab, setActiveTab] = useState<InventoryTab>('ingredients');

  // State for modals
  const [itemToEdit, setItemToEdit] = useState<Ingredient | Product | null>(null);
  const [preparationToRestock, setPreparationToRestock] = useState<Product | null>(null);
  const [ingredientToRestock, setIngredientToRestock] = useState<Ingredient | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Ingredient | Product | null>(null);
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const stockedProducts = useMemo(() => {
    return products.filter(p => p.stockLevel !== null);
  }, [products]);

  const handleEditSave = async (item: Ingredient | Product) => {
    setPageError(null);
    try {
      if ('stockUnit' in item && 'stockLevel' in item && !('price' in item)) { // It's an Ingredient
        await updateIngredient(item);
      } else { // It's a Product
        await productUseCases.updateProduct(item as Product);
        await refetchProducts();
      }
      setItemToEdit(null);
    } catch (err) {
      // rethrow for the modal to catch and display
      throw err;
    }
  };
  
  const handleRestockPreparationSave = async (item: Product, quantityToAdd: number) => {
    setPageError(null);
    try {
        await productUseCases.restockPreparation(item.id, quantityToAdd);
        await Promise.all([refetchProducts(), refetchIngredients()]);
        setPreparationToRestock(null);
    } catch (err) {
        throw err;
    }
  };

  const handleRestockIngredientSave = async (item: Ingredient, quantityToAdd: number) => {
    try {
        const newStockLevel = item.stockLevel + quantityToAdd;
        await updateIngredient({ ...item, stockLevel: newStockLevel });
        setIngredientToRestock(null);
    } catch (err) {
        throw err;
    }
  };

  const handleSaveNewIngredient = async (name: string, stockUnit: string, initialStock: number) => {
    // Let the modal handle error display, just call the hook
    await createIngredient(name, stockUnit, initialStock);
    setIsAddIngredientModalOpen(false); // Close on success
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setPageError(null);
    try {
      if ('price' in itemToDelete) { // It's a Product (preparation)
        await productUseCases.deleteProduct(itemToDelete.id);
        await refetchProducts();
      } else { // It's an Ingredient
        await deleteIngredient(itemToDelete.id);
      }
    } catch (err) {
      const itemType = 'price' in itemToDelete ? 'preparation' : 'ingredient';
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setPageError(`Failed to delete "${itemToDelete.name}": ${msg}. It might be used in another recipe.`);
    } finally {
      setItemToDelete(null);
    }
  };

  const renderIngredients = () => {
    const ingredientsTable = () => {
        if (isLoadingIngredients) return <LoadingSpinner message="Loading ingredients..." />;
        if (ingredientsError) return <p className="text-red-400 text-center py-8">{ingredientsError}</p>;
        if (ingredients.length === 0) {
            return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">No ingredients found. Add one to get started.</div>
        }

        return (
            <div className="bg-surface-card rounded-xl shadow-xl overflow-hidden">
                <table className="w-full text-left min-w-[600px]">
                <thead className="bg-surface-main">
                    <tr>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider">Ingredient Name</th>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider">Stock Level</th>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map(ing => (
                    <tr key={ing.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                        <td className="p-4 font-medium text-text-primary">{ing.name}</td>
                        <td className="p-4 text-text-secondary">{ing.stockLevel.toLocaleString()} {ing.stockUnit}</td>
                        <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setIngredientToRestock(ing)} className="p-2 text-text-secondary hover:text-green-400 transition-colors" title="Restock">
                                <PlusCircleIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setItemToEdit(ing)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Ingredient">
                            <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setItemToDelete(ing)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Ingredient">
                            <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">Raw Ingredients</h3>
                        <p className="text-text-secondary mt-1">These are the base materials used in your recipes.</p>
                    </div>
                    <button
                        onClick={() => setIsAddIngredientModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Add New Ingredient
                    </button>
                </div>
            </div>
            {ingredientsTable()}
        </div>
    );
  };

  const renderPreparations = () => {
    if (isLoadingProducts) return <LoadingSpinner message="Loading preparations..." />;
    if (productsError) return <p className="text-red-400 text-center py-8">{productsError}</p>;

    const preparationsList = () => {
        if (stockedProducts.length === 0) {
            return <p className="text-text-secondary text-center py-8">No stocked preparations found. Add one above to get started.</p>
        }
        return (
            <div className="bg-surface-card rounded-xl shadow-xl overflow-hidden">
                <table className="w-full text-left min-w-[600px]">
                <thead className="bg-surface-main">
                    <tr>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider">Preparation Name</th>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider">Stock Level</th>
                    <th className="p-4 font-semibold text-xs text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {stockedProducts.map(prod => (
                    <tr key={prod.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                        <td className="p-4 font-medium text-text-primary">{prod.name}</td>
                        <td className="p-4 text-text-secondary">{prod.stockLevel?.toLocaleString()} {prod.stockUnit}</td>
                        <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setPreparationToRestock(prod)} className="p-2 text-text-secondary hover:text-green-400 transition-colors" title="Restock">
                                <PlusCircleIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setItemToEdit(prod)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Stock Level">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setItemToDelete(prod)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Preparation">
                               <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">Tracked Preparations</h3>
                        <p className="text-text-secondary mt-1">These are intermediary products (like sauces or syrups) with their own stock levels.</p>
                    </div>
                    <button
                        onClick={onAddPreparation}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Add New Preparation
                    </button>
                </div>
            </div>
            {preparationsList()}
        </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      {itemToEdit && (
        <EditStockItemModal 
            item={itemToEdit} 
            onSave={handleEditSave} 
            onCancel={() => setItemToEdit(null)}
        />
      )}
      {preparationToRestock && (
        <RestockModal
          item={preparationToRestock}
          onSave={handleRestockPreparationSave}
          onCancel={() => setPreparationToRestock(null)}
        />
      )}
       {ingredientToRestock && (
        <RestockModal
          item={ingredientToRestock}
          onSave={handleRestockIngredientSave}
          onCancel={() => setIngredientToRestock(null)}
        />
      )}
      {itemToDelete && (
        <ConfirmModal
          title={`Delete ${'price' in itemToDelete ? 'Preparation' : 'Ingredient'}`}
          message={`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone and might fail if it is used in another product's recipe.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setItemToDelete(null)}
        />
      )}
      {isAddIngredientModalOpen && (
        <AddIngredientModal
            onSave={handleSaveNewIngredient}
            onCancel={() => setIsAddIngredientModalOpen(false)}
        />
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
      </div>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('ingredients')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ingredients' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500'}`}
            >
                Raw Ingredients
            </button>
            <button
                onClick={() => setActiveTab('preparations')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'preparations' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500'}`}
            >
                Preparations
            </button>
        </nav>
      </div>

      {pageError && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{pageError}</p>}
      
      {activeTab === 'ingredients' && renderIngredients()}
      {activeTab === 'preparations' && renderPreparations()}

    </div>
  );
};

export default InventoryPage;
