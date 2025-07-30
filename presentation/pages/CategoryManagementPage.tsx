
import React, { useState, useMemo, useCallback } from 'react';
import { ProductUseCases } from '../../domain/use-cases';
import { useProducts } from '../hooks/useProducts';
import LoadingSpinner from '../components/LoadingSpinner';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import EditCategoryModal from '../components/EditCategoryModal';
import MergeCategoryModal from '../components/MergeCategoryModal';

interface CategoryManagementPageProps {
  productUseCases: ProductUseCases;
}

const CategoryManagementPage: React.FC<CategoryManagementPageProps> = ({ productUseCases }) => {
  const { products, categories, isLoading, error, refetch } = useProducts(productUseCases);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [mergingCategory, setMergingCategory] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const category of categories) {
        counts[category] = 0;
    }
    for (const product of products) {
        for (const category of product.categories) {
            if (counts[category] !== undefined) {
                counts[category]++;
            }
        }
    }
    return counts;
  }, [products, categories]);

  const handleEditSave = async (oldName: string, newName: string) => {
    setErrorMsg(null);
    try {
      await productUseCases.updateCategoryName(oldName, newName);
      await refetch();
      setEditingCategory(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      // We throw the error so the modal can display it locally
      throw new Error(message);
    }
  };

  const handleMergeSave = async (source: string, destination: string) => {
    setErrorMsg(null);
    try {
      await productUseCases.mergeCategories(source, destination);
      await refetch();
      setMergingCategory(null);
    } catch (err) {
       const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      // We throw the error so the modal can display it locally
      throw new Error(message);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading categories..." />;
    }
    if (error) {
      return <p className="text-red-400 text-center py-8">{error}</p>;
    }
    if (categories.length === 0) {
        return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">No categories found. Categories are created when you add or edit products.</div>
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface-card rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-main">
                <tr>
                  <th className="p-4 font-semibold text-sm">Category Name</th>
                  <th className="p-4 font-semibold text-sm">Product Count</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                    <td className="p-4 font-medium text-text-primary">{category}</td>
                    <td className="p-4 text-text-secondary">{categoryCounts[category] || 0}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingCategory(category)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Rename Category">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setMergingCategory(category)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Merge/Delete Category">
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
            {categories.map(category => (
                <div key={category} className="bg-surface-card rounded-lg shadow p-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-text-primary">{category}</h3>
                        <p className="text-sm text-text-secondary">{categoryCounts[category] || 0} products</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingCategory(category)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Rename Category">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setMergingCategory(category)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Merge/Delete Category">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                </div>
            ))}
        </div>
      </>
    );
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {editingCategory && (
        <EditCategoryModal
          categoryName={editingCategory}
          onSave={handleEditSave}
          onCancel={() => setEditingCategory(null)}
        />
      )}
      {mergingCategory && (
         <MergeCategoryModal
          sourceCategory={mergingCategory}
          allCategories={categories}
          onMerge={handleMergeSave}
          onCancel={() => setMergingCategory(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Categories</h2>
      </div>
      {errorMsg && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md mb-4">{errorMsg}</p>}
      {renderContent()}
    </div>
  );
};

export default CategoryManagementPage;
