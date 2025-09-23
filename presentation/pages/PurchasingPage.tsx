import React, { useState, useEffect } from 'react';
import { SalesUseCases, InventoryUseCases } from '../../domain/use-cases';
import { usePurchaseLog } from '../hooks/usePurchaseLog';
import { useInventory } from '../hooks/useInventory';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserSession } from '../../domain/entities';
import LogPurchaseModal from '../components/LogPurchaseModal';
import { PlusIcon } from '../components/icons/PlusIcon';

interface PurchasingPageProps {
  salesUseCases: SalesUseCases;
  inventoryUseCases: InventoryUseCases;
  session: UserSession | null;
}

const toDateInputString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const PurchasingPage: React.FC<PurchasingPageProps> = ({ salesUseCases, inventoryUseCases, session }) => {
  const { log, isLoading, error, fetchLog, createPurchase } = usePurchaseLog(salesUseCases, inventoryUseCases);
  const { ingredients, isLoading: isLoadingIngredients } = useInventory(inventoryUseCases);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 29);
  
  const [startDate, setStartDate] = useState(toDateInputString(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toDateInputString(today));

  useEffect(() => {
    fetchLog({ startDate, endDate });
  }, []); // Initial fetch only

  const handleApplyFilter = () => {
    fetchLog({ startDate, endDate });
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading purchase history..." />;
    }
    if (error) {
      return <p className="text-red-400 text-center py-8">{error}</p>;
    }
    if (log.length === 0) {
      return <div className="bg-surface-card rounded-xl shadow-xl p-8 text-center text-text-secondary">No purchases found in this period. Add one to get started.</div>
    }

    return (
      <div className="bg-surface-card rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
                <thead className="bg-surface-main">
                    <tr>
                        <th className="p-3 font-semibold text-sm">Date</th>
                        <th className="p-3 font-semibold text-sm">Ingredient</th>
                        <th className="p-3 font-semibold text-sm text-right">Quantity</th>
                        <th className="p-3 font-semibold text-sm">Supplier</th>
                        <th className="p-3 font-semibold text-sm">Logged By</th>
                        <th className="p-3 font-semibold text-sm text-right">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {log.map(item => (
                        <tr key={item.id} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                            <td className="p-3 text-sm text-text-secondary whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="p-3 text-sm font-semibold text-text-primary">{item.ingredientName}</td>
                            <td className="p-3 text-sm text-text-secondary text-right">{item.quantityPurchased.toLocaleString()} {item.unit}</td>
                            <td className="p-3 text-sm text-text-secondary">{item.supplier || <span className="italic">N/A</span>}</td>
                            <td className="p-3 text-sm text-text-secondary">{item.userName || <span className="italic">N/A</span>}</td>
                            <td className="p-3 text-sm font-semibold text-text-primary text-right whitespace-nowrap">
                                Rp {item.totalCost.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      {isModalOpen && (
        <LogPurchaseModal
          onSave={createPurchase}
          onCancel={() => setIsModalOpen(false)}
          ingredients={ingredients}
          isLoadingIngredients={isLoadingIngredients}
          session={session}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Purchasing Log</h2>
          <p className="text-text-secondary mt-1">Log new material purchases and view history.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
        >
          <PlusIcon className="w-5 h-5" />
          Log Purchase
        </button>
      </div>

      <div className="bg-surface-card rounded-xl shadow-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <span className="font-semibold text-text-primary">Filter by Date</span>
        <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isLoading} className="bg-surface-main border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none [color-scheme:dark]"/>
            <span className="text-text-secondary">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isLoading} className="bg-surface-main border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none [color-scheme:dark]"/>
            <button onClick={handleApplyFilter} disabled={isLoading} className="px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 bg-brand-secondary text-white">Apply</button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default PurchasingPage;