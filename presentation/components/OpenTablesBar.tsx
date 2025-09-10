import React from 'react';
import { OpenOrder } from '../../domain/entities';
import { ClipboardListIcon } from './icons/ClipboardListIcon';

interface OpenTablesBarProps {
  openOrders: OpenOrder[];
  selectedTable: string | null;
  onSelectTable: (tableNumber: string | null) => void;
}

const TableButton: React.FC<{
    tableNumber: string | null;
    isSelected: boolean;
    onClick: () => void;
}> = ({ tableNumber, isSelected, onClick }) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 whitespace-nowrap cursor-pointer";
    const selectedClasses = "bg-brand-secondary text-white shadow-md";
    const unselectedClasses = "bg-surface-card text-text-secondary hover:bg-gray-600";

    return (
        <button onClick={onClick} className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}>
            <ClipboardListIcon className="w-4 h-4" />
            <span>{tableNumber ? `Table ${tableNumber}` : 'All Products'}</span>
        </button>
    );
};

const OpenTablesBar: React.FC<OpenTablesBarProps> = ({ openOrders, selectedTable, onSelectTable }) => {
  return (
    <div className="pb-4 border-b border-gray-700 mb-6">
      <div className="flex items-center space-x-3 overflow-x-auto pb-2">
        <TableButton 
            tableNumber={null}
            isSelected={selectedTable === null}
            onClick={() => onSelectTable(null)}
        />
        {openOrders.map(order => (
            <TableButton 
                key={order.tableNumber}
                tableNumber={order.tableNumber}
                isSelected={selectedTable === order.tableNumber}
                onClick={() => onSelectTable(order.tableNumber)}
            />
        ))}
      </div>
    </div>
  );
};

export default OpenTablesBar;