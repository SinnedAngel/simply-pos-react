import React, { useState } from 'react';
import { Product } from '../../domain/entities';
import { ProductUseCases } from '../../domain/use-cases';
import { useProducts } from '../hooks/useProducts';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

interface MenuManagementPageProps {
  productUseCases: ProductUseCases;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

const MenuManagementPage: React.FC<MenuManagementPageProps> = ({ productUseCases, onAddProduct, onEditProduct }) => {
  const { products, categories, isLoading, error, refetch } = useProducts(productUseCases);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleDelete = async () => {
    if (!productToDelete) return;
    setDeleteError(null);
    try {
      await productUseCases.deleteProduct(productToDelete.id);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setProductToDelete(null);
    }
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.categories.includes(selectedCategory));

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading menu..." />;
    }
    if (error) {
      return <p className="text-red-400 text-center py-8">{error}</p>;
    }
    if (filteredProducts.length === 0) {
        return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">{selectedCategory === 'All' ? 'No products found. Add one to get started.' : `No products found in the "${selectedCategory}" category.`}</div>
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface-card rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-surface-main">
                  <tr>
                    <th className="p-4 font-semibold text-sm w-24">Image</th>
                    <th className="p-4 font-semibold text-sm">Name</th>
                    <th className="p-4 font-semibold text-sm">Status</th>
                    <th className="p-4 font-semibold text-sm">Categories</th>
                    <th className="p-4 font-semibold text-sm">Price</th>
                    <th className="p-4 font-semibold text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                      <td className="p-2">
                        <img src={product.imageUrl} alt={product.name} className="w-16 h-12 object-cover rounded-md bg-surface-main" />
                      </td>
                      <td className="p-4 font-medium text-text-primary">{product.name}</td>
                      <td className="p-4">
                        {product.isForSale ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300">For Sale</span>
                        ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">Preparation</span>
                        )}
                      </td>
                      <td className="p-4 text-text-secondary">{product.categories.join(', ')}</td>
                      <td className="p-4 text-text-secondary">Rp {product.price.toLocaleString('id-ID')}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onEditProduct(product)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit Product">
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setProductToDelete(product)} className="p-2 text-text-secondary hover:text-red-500 transition-colors" title="Delete Product">
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
        <div className="md:hidden space-y-4">
            {filteredProducts.map(product => (
                <div key={product.id} className="bg-surface-card rounded-xl shadow-lg p-4">
                    <div className="flex gap-4">
                        <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-lg bg-surface-main" />
                        <div className="flex-grow">
                            <h3 className="font-bold text-text-primary">{product.name}</h3>
                             {product.isForSale ? (
                                <span className="text-sm text-brand-accent font-semibold mt-1 block">Rp {product.price.toLocaleString('id-ID')}</span>
                            ) : (
                                <span className="px-2 py-0.5 mt-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300 inline-block">Preparation</span>
                            )}
                            <p className="text-xs text-text-secondary mt-2 truncate">{product.categories.join(', ')}</p>
                        </div>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => onEditProduct(product)} className="p-2 bg-surface-main rounded-full text-text-secondary hover:text-brand-accent transition-colors" title="Edit Product">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setProductToDelete(product)} className="p-2 bg-surface-main rounded-full text-text-secondary hover:text-red-500 transition-colors" title="Delete Product">
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
    <div className="animate-fade-in max-w-6xl mx-auto">
      {productToDelete && (
        <ConfirmModal
          title="Delete Product"
          message={`Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setProductToDelete(null)}
        />
      )}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-2xl font-bold">Manage Products</h2>
        </div>
         <div className="flex items-center gap-4 w-full sm:w-auto">
            {!isLoading && categories.length > 0 && (
                <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full sm:w-auto bg-surface-main border border-gray-600 rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-brand-accent focus:outline-none"
                    aria-label="Filter by category"
                >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            )}
            <button
                onClick={onAddProduct}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Add Product</span>
            </button>
         </div>
      </div>
      {deleteError && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md mb-4">{deleteError}</p>}
      {renderContent()}
    </div>
  );
};

export default MenuManagementPage;