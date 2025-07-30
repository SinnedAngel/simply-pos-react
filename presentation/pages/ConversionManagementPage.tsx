
import React, { useState } from 'react';
import { ConversionUseCases, InventoryUseCases } from '../../domain/use-cases';
import { useConversions } from '../hooks/useConversions';
import { useInventory } from '../hooks/useInventory';
import LoadingSpinner from '../components/LoadingSpinner';
import { UnitConversion } from '../../domain/entities';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmModal from '../components/ConfirmModal';
import EditConversionModal from '../components/EditConversionModal';

interface ConversionManagementPageProps {
  conversionUseCases: ConversionUseCases;
  inventoryUseCases: InventoryUseCases;
}

const ConversionManagementPage: React.FC<ConversionManagementPageProps> = ({ conversionUseCases, inventoryUseCases }) => {
  const { conversions, isLoading, error: pageError, createConversion, deleteConversion, updateConversion } = useConversions(conversionUseCases);
  const { ingredients, isLoading: isLoadingIngredients } = useInventory(inventoryUseCases);

  // Modal state
  const [conversionToEdit, setConversionToEdit] = useState<UnitConversion | 'new' | null>(null);
  const [conversionToDelete, setConversionToDelete] = useState<UnitConversion | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const handleSave = async (data: Omit<UnitConversion, 'id' | 'ingredientName'> | Omit<UnitConversion, 'ingredientName'>) => {
    setModalError(null);
    try {
        if ('id' in data) {
            await updateConversion(data);
        } else {
            await createConversion(data);
        }
        setConversionToEdit(null);
    } catch (err) {
        // rethrow for the modal to catch and display
        throw err;
    }
  };

  const handleDelete = async () => {
    if (!conversionToDelete) return;
    setModalError(null);
    try {
      await deleteConversion(conversionToDelete.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setModalError(`Failed to delete: ${msg}.`);
    } finally {
      setConversionToDelete(null);
    }
  };
  
  const renderContent = () => {
    if (isLoading) return <LoadingSpinner message="Loading conversions..." />;
    if (pageError && conversions.length === 0) return <p className="text-red-400 text-center py-8">{pageError}</p>;
    if (conversions.length === 0) {
        return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">No custom conversions found. Add one to get started.</div>
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface-card rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-main">
                <tr>
                  <th className="p-4 font-semibold text-sm">From Unit</th>
                  <th className="p-4 font-semibold text-sm">To Unit</th>
                  <th className="p-4 font-semibold text-sm">Factor</th>
                  <th className="p-4 font-semibold text-sm">Applies To</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map(conv => (
                  <tr key={conv.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                    <td className="p-4 font-medium text-text-primary">{conv.fromUnit}</td>
                    <td className="p-4 font-medium text-text-primary">{conv.toUnit}</td>
                    <td className="p-4 text-text-secondary">{conv.factor}</td>
                    <td className="p-4 text-text-secondary">
                      {conv.ingredientName 
                          ? <span className="font-semibold text-brand-accent">{conv.ingredientName}</span> 
                          : <span className="italic">All ingredients</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setConversionToEdit(conv)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Conversion">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConversionToDelete(conv)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Conversion">
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
            {conversions.map(conv => (
                <div key={conv.id} className="bg-surface-card rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-text-secondary">
                                1 <span className="font-semibold text-text-primary">{conv.fromUnit}</span> = {conv.factor} <span className="font-semibold text-text-primary">{conv.toUnit}</span>
                            </p>
                            <p className="text-sm text-text-secondary mt-1">
                                Applies to: {conv.ingredientName 
                                  ? <span className="font-semibold text-brand-accent">{conv.ingredientName}</span> 
                                  : <span className="italic">All ingredients</span>}
                            </p>
                        </div>
                         <div className="flex items-center gap-2">
                            <button onClick={() => setConversionToEdit(conv)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Conversion">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConversionToDelete(conv)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Conversion">
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
      {conversionToEdit && (
        <EditConversionModal
          conversion={conversionToEdit}
          onSave={handleSave}
          onCancel={() => setConversionToEdit(null)}
          ingredients={ingredients}
          isLoadingIngredients={isLoadingIngredients}
        />
      )}
      {conversionToDelete && (
        <ConfirmModal
          title="Delete Conversion Rule"
          message={`Are you sure you want to delete the conversion from ${conversionToDelete.fromUnit} to ${conversionToDelete.toUnit}?`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConversionToDelete(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold">Manage Unit Conversions</h2>
            <p className="text-text-secondary mt-1 max-w-lg">Define rules to convert between units for inventory tracking.</p>
        </div>
        <button
          onClick={() => setConversionToEdit('new')}
          className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors self-end sm:self-center"
        >
          Add Conversion
        </button>
      </div>
      
      {modalError && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{modalError}</p>}
      
      {renderContent()}
    </div>
  );
};

export default ConversionManagementPage;
