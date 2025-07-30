

import React from 'react';
import { Product } from '../../domain/entities';
import { EditIcon } from './icons/EditIcon';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  canEdit: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onEdit, canEdit }) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the onSelect handler from being called
    onEdit(product);
  };
  
  return (
    <div
      onClick={() => onSelect(product)}
      className="bg-surface-card rounded-lg shadow-lg overflow-hidden cursor-pointer group transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-accent/10 relative"
    >
      {canEdit && (
         <button
            onClick={handleEditClick}
            className="absolute top-2 right-2 z-10 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-brand-secondary"
            aria-label="Edit product"
         >
            <EditIcon className="w-4 h-4" />
         </button>
      )}

      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110"
        // Show a fallback background if the image is broken
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3IiAvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNkMWQ1ZGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBhdmFpbGFibGUgc29vbjwvdGV4dD48L3N2Zz4='; }}
      />
      <div className="p-4">
        <h3 className="text-md font-semibold text-text-primary truncate">{product.name}</h3>
        <p className="text-sm text-text-secondary mt-1">Rp {product.price.toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
};

export default ProductCard;