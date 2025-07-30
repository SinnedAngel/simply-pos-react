import React, { useState, useEffect } from 'react';
import { useProducts } from './hooks/useProducts';
import { useOrder } from './hooks/useOrder';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import OrderSummary from './components/OrderSummary';
import ConfirmModal from './components/ConfirmModal';
import { ProductUseCases, OrderUseCases, AuthUseCases, MediaUseCases, SalesUseCases, InventoryUseCases, ConversionUseCases } from '../domain/use-cases';
import LoadingSpinner from './components/LoadingSpinner';
import MediaLibraryPage from './pages/MediaLibraryPage';
import MenuManagementPage from './pages/MenuManagementPage';
import AddAccountPage from './pages/AddAccountPage';
import EditProductModal from './components/EditProductModal';
import { Product, UserSession } from '../domain/entities';
import RoleManagementPage from './pages/RoleManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import ReportingPage from './pages/ReportingPage';
import InventoryPage from './pages/InventoryPage';
import ConversionManagementPage from './pages/ConversionManagementPage';
import { ShoppingCartIcon } from './components/icons/ShoppingCartIcon';
import { XIcon } from './components/icons/XIcon';


interface PosAppProps {
  productUseCases: ProductUseCases;
  orderUseCases: OrderUseCases;
  authUseCases: AuthUseCases;
  mediaUseCases: MediaUseCases;
  salesUseCases: SalesUseCases;
  inventoryUseCases: InventoryUseCases;
  conversionUseCases: ConversionUseCases;
  onSessionEnd: () => void;
}

type AppView = 'pos' | 'menu' | 'categories' | 'inventory' | 'conversions' | 'media' | 'accounts' | 'roles' | 'reporting';

function PosApp({ productUseCases, orderUseCases, authUseCases, mediaUseCases, salesUseCases, inventoryUseCases, conversionUseCases, onSessionEnd }: PosAppProps) {
  const { products, categories, isLoading, error, isDbEmpty, schemaError, refetch } = useProducts(productUseCases);
  const { order, addItem, removeItem, updateItemQuantity, clearOrder } = useOrder(orderUseCases);

  const [view, setView] = useState<AppView>('pos');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isOrderSummaryVisible, setIsOrderSummaryVisible] = useState(false);


  useEffect(() => {
    // Load session info once on component mount
    const currentSession = authUseCases.getSession();
    setSession(currentSession);

    if (isDbEmpty && view === 'pos') {
      setShowConfirmModal(true);
    }
  }, [isDbEmpty, view, authUseCases]);


  const handleSeedDatabase = async () => {
    setShowConfirmModal(false);
    setIsSeeding(true);
    setSeedError(null);
    try {
      await productUseCases.seedDatabase();
      await refetch();
    } catch (err) {
      if (err instanceof Error) {
        setSeedError(err.message);
      } else {
        setSeedError('An unknown error occurred during seeding. Check the console for more details.');
        console.error('An unexpected error object was thrown during seeding:', err);
      }
    } finally {
      setIsSeeding(false);
    }
  };
  
  const handleLogout = () => {
    try {
      authUseCases.logout();
      onSessionEnd();
    } catch(err) {
      alert("Logout failed. Please try again.");
      console.error(err);
    }
  };

  const handleCheckout = async () => {
    if (order.items.length === 0) return;
    
    // Add a permission check here as a safeguard.
    if (!session?.permissions.includes('create_sales') || !session.id) {
      const err = new Error("You do not have permission or are not properly signed in to perform this action.");
      setCheckoutMessage({ type: 'error', text: err.message });
      setTimeout(() => setCheckoutMessage(null), 5000);
      throw err; // For OrderSummary loading state
    }

    const orderTotal = order.total;
    try {
        await salesUseCases.createOrder(order, session.id);
        clearOrder();
        setCheckoutMessage({ type: 'success', text: `Checkout successful! Total: Rp ${orderTotal.toLocaleString('id-ID')}`});
        setIsOrderSummaryVisible(false); // Close mobile modal on success
        setTimeout(() => setCheckoutMessage(null), 4000);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setCheckoutMessage({ type: 'error', text: `Checkout failed: ${errorMessage}` });
        setTimeout(() => setCheckoutMessage(null), 5000);
        // Re-throw so the OrderSummary component can stop its loading indicator
        throw err;
    }
  };


  const handleSaveProduct = async (productData: Product | Omit<Product, 'id' | 'categories'> & { categories: string[], recipe: any[] }) => {
    try {
      if ('id' in productData) {
        // This is a full Product object for an update
        await productUseCases.updateProduct(productData);
      } else {
        // This is data for a new product
        await productUseCases.createProduct(productData);
      }
      setEditingProduct(null); // Close modal on success
      await refetch(); // Refresh product list to show changes
    } catch (err) {
      // In a real app, you'd show a toast notification here
      console.error("Failed to save product:", err);
      alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
      // Do not close modal on error, so user can see the error message
      throw err;
    }
  };

  const renderPosContent = () => {
    if (schemaError) {
        return <p className="text-red-400 text-center py-8">An unexpected schema error occurred. Please try refreshing the application.</p>;
    }
    if (error) {
      return <p className="text-red-400 text-center py-8">Error loading menu: {error}</p>;
    }
    if (isSeeding) {
       return <LoadingSpinner message="Initializing Database..." />;
    }
    if (seedError) {
       return <p className="text-red-400 text-center py-8">{seedError}</p>;
    }
    if (isLoading) {
      return <LoadingSpinner message="Loading Menu..." />;
    }
    if (products.length === 0 && !isDbEmpty) {
        return <p className="text-text-secondary text-center py-8">No products found.</p>;
    }

    const canEditProducts = session?.permissions.includes('manage_menu') ?? false;
    const canCreateSales = session?.permissions.includes('create_sales') ?? false;

    return (
      <ProductGrid
        products={products}
        categories={categories}
        onProductSelect={addItem}
        onEditProduct={setEditingProduct}
        canEditProducts={canEditProducts}
        canAddToOrder={canCreateSales}
      />
    );
  };
  
  const renderMainContent = () => {
    switch (view) {
      case 'pos':
        return renderPosContent();
      case 'menu':
        return <MenuManagementPage productUseCases={productUseCases} onEditProduct={setEditingProduct} onAddProduct={() => setEditingProduct('new')} />;
      case 'categories':
        return <CategoryManagementPage productUseCases={productUseCases} />;
      case 'inventory':
        return <InventoryPage useCases={inventoryUseCases} />;
      case 'conversions':
        return <ConversionManagementPage conversionUseCases={conversionUseCases} inventoryUseCases={inventoryUseCases} />;
      case 'media':
        return <MediaLibraryPage useCases={mediaUseCases} />;
      case 'accounts':
        return <AddAccountPage useCases={authUseCases} />;
      case 'roles':
        return <RoleManagementPage useCases={authUseCases} />;
      case 'reporting':
        return <ReportingPage useCases={salesUseCases} />;
      default:
        return null;
    }
  };

  const canCreateSales = session?.permissions.includes('create_sales') ?? false;

  const orderSummaryComponent = (
    <OrderSummary
        order={order}
        onRemoveItem={removeItem}
        onUpdateQuantity={updateItemQuantity}
        onCheckout={handleCheckout}
        canCheckout={canCreateSales}
    />
  );

  return (
    <div className="w-full h-screen font-sans text-text-primary bg-surface-main">
       {checkoutMessage && (
         <div className={`fixed top-5 right-5 z-[100] p-4 rounded-lg shadow-lg animate-fade-in text-white ${checkoutMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
           {checkoutMessage.text}
         </div>
       )}
       {showConfirmModal && (
        <ConfirmModal
          title="Database Empty"
          message="Your product catalog is empty. Would you like to initialize it with sample data, including ingredients and recipes?"
          confirmText="Initialize"
          onConfirm={handleSeedDatabase}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {editingProduct !== null && (
        <EditProductModal
          product={editingProduct}
          allProducts={products}
          inventoryUseCases={inventoryUseCases}
          mediaUseCases={mediaUseCases}
          categories={categories}
          onSave={handleSaveProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}
      <div className="flex h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col overflow-y-auto">
          <Header onLogout={handleLogout} currentView={view} onNavigate={setView} session={session} />
          <div className="flex-grow mt-6">{renderMainContent()}</div>
        </main>
        
        {/* Desktop Sidebar */}
        {view === 'pos' && (
            <aside className="w-full max-w-sm lg:max-w-md bg-surface-sidebar p-4 sm:p-6 shadow-lg hidden lg:flex flex-col">
              {orderSummaryComponent}
            </aside>
        )}
      </div>

       {/* Mobile Order Summary */}
      {view === 'pos' && (
        <div className="lg:hidden">
            {/* FAB to open */}
            <button
                onClick={() => setIsOrderSummaryVisible(true)}
                className="fixed bottom-6 right-6 bg-brand-primary hover:bg-brand-secondary text-white rounded-full p-4 shadow-xl z-40 flex items-center justify-center"
                aria-label="View current order"
            >
                <ShoppingCartIcon className="w-6 h-6" />
                {order.items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {order.items.length}
                    </span>
                )}
            </button>
            
            {/* Modal */}
            {isOrderSummaryVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setIsOrderSummaryVisible(false)}></div>
                    <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-surface-sidebar p-6 rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                        <button 
                            onClick={() => setIsOrderSummaryVisible(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            aria-label="Close order summary"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                        {orderSummaryComponent}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default PosApp;