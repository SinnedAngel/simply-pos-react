
import React, { useState } from 'react';
import { Product } from '../../domain/entities';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  categories: string[];
  onProductSelect: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  canEditProducts: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, categories, onProductSelect, onEditProduct, canEditProducts }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.categories.includes(selectedCategory));

  return (
    <div className="mt-8">
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        <CategoryTab 
            name="All"
            isSelected={selectedCategory === 'All'}
            onClick={() => setSelectedCategory('All')}
        />
        {categories.map(category => (
            <CategoryTab 
                key={category}
                name={category}
                isSelected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
            />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onProductSelect}
            onEdit={onEditProduct}
            canEdit={canEditProducts}
          />
        ))}
      </div>
    </div>
  );
};


interface CategoryTabProps {
    name: string;
    isSelected: boolean;
    onClick: () => void;
}

const CategoryTab: React.FC<CategoryTabProps> = ({ name, isSelected, onClick }) => {
    const baseClasses = "px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer";
    const selectedClasses = "bg-brand-secondary text-white shadow-md";
    const unselectedClasses = "bg-surface-card text-text-secondary hover:bg-gray-600";
    
    return (
        <button onClick={onClick} className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}>
            {name}
        </button>
    );
};


export default ProductGrid;
