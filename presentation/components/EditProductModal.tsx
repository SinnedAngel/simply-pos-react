
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, StoredImage, Ingredient, RecipeItem } from '../../domain/entities';
import { MediaUseCases, InventoryUseCases } from '../../domain/use-cases';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import LoadingSpinner from './LoadingSpinner';
import { UploadIcon } from './icons/UploadIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CubeIcon } from './icons/CubeIcon';
import { BeakerIcon } from './icons/BeakerIcon';

type EditingProductState = Product | { mode: 'new'; defaults?: Partial<Omit<Product, 'id' | 'recipe' | 'categories'>> } | null;


interface EditProductModalProps {
  product: EditingProductState;
  allProducts: Product[];
  mediaUseCases: MediaUseCases;
  inventoryUseCases: InventoryUseCases;
  categories: string[];
  onSave: (product: Product | Omit<Product, 'id' | 'categories'> & { categories: string[], recipe: RecipeItem[] }) => Promise<void>;
  onCancel: () => void;
}

type MobileTab = 'details' | 'recipe' | 'image';

const CategoryCheckbox: React.FC<{
    category: string;
    isChecked: boolean;
    onChange: (category: string, checked: boolean) => void;
    disabled: boolean;
}> = ({ category, isChecked, onChange, disabled }) => (
    <label className="flex items-center gap-2 p-2 rounded-md hover:bg-surface-main/50 transition-colors">
        <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(category, e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-500 bg-surface-main text-brand-secondary focus:ring-brand-secondary"
        />
        <span className="text-text-primary">{category}</span>
    </label>
);

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; description?: string;}> = ({ label, enabled, setEnabled, description }) => (
    <div className="flex items-center justify-between">
        <div>
            <label className="text-sm font-medium text-text-primary">{label}</label>
            {description && <p className="text-xs text-text-secondary">{description}</p>}
        </div>
        <button
            type="button"
            className={`${enabled ? 'bg-brand-secondary' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-surface-card`}
            onClick={() => setEnabled(!enabled)}
        >
            <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
        </button>
    </div>
);


const EditProductModal: React.FC<EditProductModalProps> = ({ product, allProducts, mediaUseCases, inventoryUseCases, categories, onSave, onCancel }) => {
  const isNew = product !== null && typeof product === 'object' && !('id' in product);
  const productData = product !== null && typeof product === 'object' && 'id' in product ? product : null;
  const defaultValues = isNew ? (product as { defaults?: any }).defaults || {} : {};

  // Form State
  const [name, setName] = useState(productData?.name ?? defaultValues.name ?? '');
  const [price, setPrice] = useState(productData?.price ?? defaultValues.price ?? 0);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(productData?.categories ?? []));
  const [selectedImageUrl, setSelectedImageUrl] = useState(productData?.imageUrl ?? defaultValues.imageUrl ?? '');
  const [recipe, setRecipe] = useState<RecipeItem[]>(productData?.recipe ?? []);
  
  const [isForSale, setIsForSale] = useState(productData?.isForSale ?? defaultValues.isForSale ?? true);
  const [isTracked, setIsTracked] = useState(productData ? productData.stockLevel !== null : (defaultValues.stockLevel !== undefined));
  const [stockLevel, setStockLevel] = useState(productData?.stockLevel ?? defaultValues.stockLevel ?? 0);
  const [stockUnit, setStockUnit] = useState(productData?.stockUnit ?? defaultValues.stockUnit ?? '');
  
  // Modal/Interaction State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<MobileTab>('details');

  // Media Library State
  const { images, isLoading: isLoadingMedia, error: mediaError, uploadImages, isUploading: isUploadingMedia } = useMediaLibrary(mediaUseCases);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ingredient State
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [recipeSearch, setRecipeSearch] = useState('');
  
  useEffect(() => {
    const fetchIngredients = async () => {
        try {
            const fetched = await inventoryUseCases.getIngredients();
            setAllIngredients(fetched);
        } catch (e) {
            setError('Could not load ingredients list.');
        } finally {
            setIsLoadingIngredients(false);
        }
    }
    fetchIngredients();
  }, [inventoryUseCases]);

  useEffect(() => {
    // When toggling 'isForSale' off, if the user is on the 'Image' tab on mobile,
    // switch them back to the 'Details' tab.
    if (!isForSale && activeTab === 'image') {
        setActiveTab('details');
    }
  }, [isForSale, activeTab]);


  const handleCategoryChange = (category: string, isChecked: boolean) => {
    setSelectedCategories(prev => {
        const newSet = new Set(prev);
        if (isChecked) newSet.add(category);
        else newSet.delete(category);
        return newSet;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setError('');
      try {
        const newImages: StoredImage[] = await uploadImages(files);
        if (newImages.length > 0) setSelectedImageUrl(newImages[0].url);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
      }
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleAddRecipeItem = (item: Ingredient | Product, type: 'ingredient' | 'product') => {
    if (type === 'ingredient') {
        const ingredient = item as Ingredient;
        if (recipe.some(r => r.type === 'ingredient' && r.ingredientId === ingredient.id)) return;
        setRecipe(prev => [...prev, {
            type: 'ingredient',
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            quantity: 1,
            unit: ingredient.stockUnit,
        }]);
    } else {
        const subProduct = item as Product;
        if (recipe.some(r => r.type === 'product' && r.productId === subProduct.id)) return;
        setRecipe(prev => [...prev, {
            type: 'product',
            productId: subProduct.id,
            productName: subProduct.name,
            quantity: 1,
            unit: 'pcs',
        }]);
    }
    setRecipeSearch('');
  };

  const handleUpdateRecipeItem = (index: number, field: 'quantity' | 'unit', value: string | number) => {
    setRecipe(prev => prev.map((item, i) => {
        if (i === index) {
            if (field === 'quantity') {
                const n = parseFloat(String(value));
                 return { ...item, quantity: isNaN(n) || n < 0 ? item.quantity : n };
            }
            if(field === 'unit') {
                return { ...item, unit: String(value) };
            }
        }
        return item;
    }));
  };
  
  const handleRemoveRecipeItem = (index: number) => {
    setRecipe(prev => prev.filter((_, i) => i !== index));
  }

  const handleSave = async () => {
    // General validations
    if (!name.trim()) { setError('Product name is required.'); return; }
    if (isTracked && !stockUnit.trim()) { setError('Stock unit is required for tracked items.'); return;}

    // Validations only for items for sale
    if (isForSale) {
        if (selectedCategories.size === 0) { setError('At least one category must be selected for saleable items.'); return; }
        if (isNaN(price) || price <= 0) { setError('Price must be a positive number for items for sale.'); return; }
        if (!selectedImageUrl) { setError('You must select an image for the product.'); return; }
    }
    
    setError('');
    setIsSaving(true);
    
    const saveData = { 
        name, 
        price: isForSale ? price : 0, 
        categories: isForSale ? Array.from(selectedCategories) : [],
        imageUrl: selectedImageUrl, 
        recipe,
        isForSale,
        stockLevel: isTracked ? stockLevel : null,
        stockUnit: isTracked ? stockUnit : null,
    };

    try {
        if (productData) {
            await onSave({ ...saveData, id: productData.id });
        } else {
            await onSave(saveData);
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during save.');
        setIsSaving(false);
    }
  };
  
  const filteredRecipeComponents = useMemo(() => {
    if (!recipeSearch) return [];
    
    const ingredients = allIngredients
      .filter(ing => 
        ing.name.toLowerCase().includes(recipeSearch.toLowerCase()) &&
        !recipe.some(r => r.type === 'ingredient' && r.ingredientId === ing.id)
      )
      .map(ing => ({ ...ing, itemType: 'ingredient' as const }));

    const products = allProducts
       .filter(p => 
        p.name.toLowerCase().includes(recipeSearch.toLowerCase()) &&
        !recipe.some(r => r.type === 'product' && r.productId === p.id) &&
        (!productData || p.id !== productData.id) // Prevent adding itself to its own recipe
      )
      .map(p => ({ ...p, itemType: 'product' as const }));

    return [...ingredients, ...products].slice(0, 10);
  }, [recipeSearch, allIngredients, allProducts, recipe, productData]);
  
  const TabButton: React.FC<{tab: MobileTab, children: React.ReactNode}> = ({ tab, children }) => (
    <button 
        onClick={() => setActiveTab(tab)}
        className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-brand-secondary text-text-primary' : 'border-transparent text-text-secondary'}`}
    >
        {children}
    </button>
  );

  const FormDetails = (
     <div className="space-y-4">
        <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-text-secondary mb-2">Product Name</label>
            <input id="product-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., Iced Latte" />
        </div>
        
        <div className="space-y-3 p-3 bg-surface-main/50 rounded-md">
            <ToggleSwitch label="Item is for sale" enabled={isForSale} setEnabled={setIsForSale} description="Visible on the Point of Sale screen." />
            <ToggleSwitch label="Track item stock" enabled={isTracked} setEnabled={setIsTracked} description="Enable to manage stock for this item." />
        </div>

        {isForSale && (
            <div>
                <label htmlFor="product-price" className="block text-sm font-medium text-text-secondary mb-2">Price</label>
                <input id="product-price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., 25000"/>
            </div>
        )}
        
        {isTracked && (
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="stock-level" className="block text-sm font-medium text-text-secondary mb-2">Current Stock</label>
                    <input id="stock-level" type="number" value={stockLevel} onChange={(e) => setStockLevel(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
                </div>
                 <div>
                    <label htmlFor="stock-unit" className="block text-sm font-medium text-text-secondary mb-2">Stock Unit</label>
                    <input id="stock-unit" type="text" value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none" placeholder="e.g., gram, ml, pcs"/>
                </div>
            </div>
        )}
        
        {isForSale && (
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Categories</label>
                <div className="w-full max-h-40 overflow-y-auto bg-surface-main rounded-md p-2 border border-gray-600 grid grid-cols-2 gap-1">
                    {categories.length > 0 ? categories.map(cat => <CategoryCheckbox key={cat} category={cat} isChecked={selectedCategories.has(cat)} onChange={handleCategoryChange} disabled={false} />) : <p className="text-text-secondary text-sm p-2 col-span-2 text-center">No categories exist.</p>}
                </div>
            </div>
        )}
     </div>
  );
  
  const FormRecipe = (
    <div className="flex flex-col gap-2 mt-6">
        <label className="block text-sm font-medium text-text-secondary">Recipe Components</label>
        <div className="relative">
            <input type="text" placeholder="Search to add ingredients or products..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
            {filteredRecipeComponents.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-sidebar border border-gray-600 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {filteredRecipeComponents.map(item => (
                        <button key={`${item.itemType}-${item.id}`} onClick={() => handleAddRecipeItem(item, item.itemType)} className="w-full text-left px-4 py-2 hover:bg-surface-main flex items-center gap-2">
                            {item.itemType === 'ingredient' ? <BeakerIcon className="w-4 h-4 text-green-400 flex-shrink-0" /> : <CubeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
        <div className="w-full min-h-[100px] max-h-48 overflow-y-auto bg-surface-main rounded-md p-2 border border-gray-600 space-y-2">
            {recipe.length > 0 ? recipe.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 bg-surface-sidebar p-2 rounded">
                    <div className="flex items-center gap-2 flex-1 truncate">
                        {item.type === 'ingredient' ? <BeakerIcon className="w-4 h-4 text-green-400 flex-shrink-0" /> : <CubeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                        <span className="text-text-primary truncate">{item.type === 'ingredient' ? item.ingredientName : item.productName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <input type="number" value={item.quantity} onChange={e => handleUpdateRecipeItem(index, 'quantity', e.target.value)} className="w-16 px-2 py-1 bg-surface-main border border-gray-600 rounded-md text-right"/>
                        <input type="text" value={item.unit} onChange={e => handleUpdateRecipeItem(index, 'unit', e.target.value)} className="w-20 px-2 py-1 bg-surface-main border border-gray-600 rounded-md" placeholder="unit"/>
                    </div>
                    <button onClick={() => handleRemoveRecipeItem(index)} className="p-1 text-red-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                </div>
            )) : <p className="text-text-secondary text-sm text-center p-4">No components in recipe.</p>}
        </div>
    </div>
  );

  const FormImage = (
    <div className="flex flex-col h-full">
        <h3 className="text-lg font-semibold text-text-primary mb-2 hidden sm:block">Product Image</h3>
        <div className="w-full h-48 rounded-md bg-surface-main flex items-center justify-center mb-4">
            {selectedImageUrl ? <img src={selectedImageUrl} alt="Selected product" className="w-full h-full object-cover rounded-md" /> : <p className="text-text-secondary">Select an image</p>}
        </div>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-text-secondary">Choose from Library</h3>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingMedia} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed">
            {isUploadingMedia ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Uploading...</> : <><UploadIcon className="w-4 h-4" />Upload New</>}
            </button>
        </div>
        <div className="flex-grow bg-surface-main rounded-md p-3 overflow-y-auto">
            {isLoadingMedia && <LoadingSpinner message="Loading images..." />}
            {mediaError && !error && <p className="text-red-400">{mediaError}</p>}
            {!isLoadingMedia && !mediaError && (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {images.map(image => (
                        <button key={image.name} onClick={() => setSelectedImageUrl(image.url)} className={`rounded-md overflow-hidden border-2 transition-colors ${selectedImageUrl === image.url ? 'border-brand-secondary' : 'border-transparent hover:border-brand-accent'}`}>
                            <img src={image.url} alt={image.name} className="w-full h-24 object-cover" />
                        </button>
                    ))}
                </div>
            )}
            {!isLoadingMedia && images.length === 0 && <p className="text-text-secondary text-center p-4">No images in library.</p>}
        </div>
    </div>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          hidden
          multiple
          accept="image/png, image/jpeg, image/gif, image/webp"
      />
      <div className="bg-surface-card shadow-2xl flex flex-col w-full h-full sm:rounded-xl sm:w-full sm:max-w-6xl sm:h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-text-primary">{!productData ? 'Add New Product' : 'Edit Product'}</h2>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} disabled={isSaving || isUploadingMedia} className="px-6 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50 hidden sm:block">Cancel</button>
                <button onClick={handleSave} disabled={isSaving || isUploadingMedia} className="px-6 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                 <button onClick={onCancel} className="px-2 py-2 rounded-md text-text-secondary font-semibold transition-colors disabled:opacity-50 sm:hidden">Close</button>
            </div>
        </div>

        {/* Mobile Tabs */}
        <div className="sm:hidden flex border-b border-gray-700">
            <TabButton tab="details">Details</TabButton>
            <TabButton tab="recipe">Recipe</TabButton>
            {isForSale && <TabButton tab="image">Image</TabButton>}
        </div>

        {/* Content */}
        <div className="flex-grow p-4 sm:p-6 overflow-hidden">
            <div className="h-full overflow-y-auto">
                {/* Desktop Layout */}
                <div className={`hidden sm:grid ${isForSale ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-x-8 h-full`}>
                    <div className={`space-y-6 overflow-y-auto ${isForSale ? 'pr-4' : ''}`}>{FormDetails}{FormRecipe}</div>
                    {isForSale && <div className="overflow-y-auto flex flex-col">{FormImage}</div>}
                </div>
                {/* Mobile Layout */}
                <div className="sm:hidden h-full">
                    {activeTab === 'details' && FormDetails}
                    {activeTab === 'recipe' && FormRecipe}
                    {isForSale && activeTab === 'image' && <div className="h-full">{FormImage}</div>}
                </div>
            </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center p-2 bg-red-900/40">{error}</p>}
      </div>
    </div>
  );
};

// A new icon for ingredients
const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4.5 3h15"></path>
    <path d="M6 3v16a2 2 0 002 2h8a2 2 0 002-1V3"></path>
    <path d="M6 14h12"></path>
  </svg>
);

export default EditProductModal;
