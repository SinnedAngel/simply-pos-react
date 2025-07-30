import React, { useState } from 'react';
import { SalesUseCases } from '../../domain/use-cases';
import { useReporting } from '../hooks/useReporting';
import LoadingSpinner from '../components/LoadingSpinner';
import SalesChart from '../components/SalesChart';
import { OrderLogItem } from '../../domain/entities';


interface ReportingPageProps {
  useCases: SalesUseCases;
}

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-surface-card rounded-xl p-6 shadow-lg">
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
    </div>
);

// A small utility to format a Date object to a 'YYYY-MM-DD' string for input[type=date]
const toDateInputString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const OrderLogTable: React.FC<{ log: OrderLogItem[] | null }> = ({ log }) => {
    if (!log || log.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center">
                <p className="text-text-secondary">No orders found in this period.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left min-w-[600px]">
                <thead className="bg-surface-main sticky top-0 z-10">
                    <tr>
                        <th className="p-3 font-semibold text-sm">Time</th>
                        <th className="p-3 font-semibold text-sm">Cashier</th>
                        <th className="p-3 font-semibold text-sm">Items</th>
                        <th className="p-3 font-semibold text-sm text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {log.map(order => (
                        <tr key={order.orderId} className="border-b border-surface-main last:border-b-0 hover:bg-surface-main/50 transition-colors">
                            <td className="p-3 text-sm text-text-secondary whitespace-nowrap">
                                {new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="p-3 text-sm text-text-primary">{order.cashierUsername || <span className="italic text-text-secondary">N/A</span>}</td>
                            <td className="p-3 text-sm text-text-secondary">
                                <ul className="space-y-1">
                                    {order.items.map((item, index) => (
                                        <li key={index}>{item.quantity}x {item.productName}</li>
                                    ))}
                                </ul>
                            </td>
                            <td className="p-3 text-sm font-semibold text-text-primary text-right whitespace-nowrap">
                                Rp {order.total.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ReportingPage: React.FC<ReportingPageProps> = ({ useCases }) => {
    const { report, orderLog, isLoading, error, fetchReport, activeFilter } = useReporting(useCases);
    const [startDate, setStartDate] = useState(toDateInputString(new Date()));
    const [endDate, setEndDate] = useState(toDateInputString(new Date()));
    const [customDateError, setCustomDateError] = useState('');

    const handleApplyCustomDate = () => {
        setCustomDateError('');
        if (new Date(startDate) > new Date(endDate)) {
            setCustomDateError('Start date cannot be after end date.');
            return;
        }
        fetchReport({ startDate, endDate });
    };

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="Generating report..." />;
        }
        if (error) {
            return <p className="text-red-400 text-center py-8">{error}</p>;
        }
        if (!report) {
            return <p className="text-text-secondary text-center py-8">No data available for the selected period.</p>;
        }

        return (
            <div className="space-y-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Revenue" value={`Rp ${report.totalRevenue.toLocaleString('id-ID')}`} />
                    <StatCard title="Total Orders" value={report.orderCount.toLocaleString('id-ID')} />
                    <StatCard title="Avg. Order Value" value={`Rp ${report.avgOrderValue.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sales Chart */}
                    <div className="lg:col-span-2 bg-surface-card rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Sales Over Time</h3>
                        {report.dailySales.length > 0 ? (
                            <SalesChart data={report.dailySales} />
                        ) : (
                             <div className="h-64 flex items-center justify-center">
                                <p className="text-text-secondary">No sales data to display for this period.</p>
                            </div>
                        )}
                    </div>

                    {/* Top Selling Products */}
                    <div className="bg-surface-card rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Top Selling Products</h3>
                         {report.topProducts.length > 0 ? (
                            <ul className="space-y-3">
                                {report.topProducts.map((product, index) => (
                                    <li key={product.name} className="flex justify-between items-center text-sm">
                                        <span className="text-text-primary truncate pr-4">
                                            {index + 1}. {product.name}
                                            {product.price != null && (
                                                <span className="text-text-secondary ml-2">
                                                    (Rp{product.price.toLocaleString('id-ID')})
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-semibold text-text-secondary bg-surface-main px-2 py-1 rounded-md">{product.quantity} sold</span>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-text-secondary text-sm">No products sold in this period.</p>
                            </div>
                         )}
                    </div>

                    {/* New Order Log section */}
                    <div className="bg-surface-card rounded-xl p-6 shadow-lg lg:col-span-3">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Order Log</h3>
                        <OrderLogTable log={orderLog} />
                    </div>
                </div>
            </div>
        );
    };
    
    const DateRangeButton: React.FC<{range: '7d' | '30d' | 'today'}> = ({ range }) => {
        const textMap = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'today': 'Today' };
        const isActive = activeFilter === range;
        return (
             <button
                onClick={() => fetchReport(range)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${isActive ? 'bg-brand-secondary text-white' : 'bg-surface-card text-text-secondary hover:bg-surface-main'}`}
            >
                {textMap[range]}
            </button>
        )
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Sales Report</h2>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <DateRangeButton range="today" />
                    <DateRangeButton range="7d" />
                    <DateRangeButton range="30d" />
                    
                    <div className="flex items-center gap-2 border-l-2 border-surface-card pl-2 ml-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isLoading} className="bg-surface-main border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none [color-scheme:dark]"/>
                        <span className="text-text-secondary">to</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isLoading} className="bg-surface-main border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none [color-scheme:dark]"/>
                        <button onClick={handleApplyCustomDate} disabled={isLoading} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${activeFilter === 'custom' ? 'bg-brand-secondary text-white' : 'bg-surface-card text-text-secondary hover:bg-surface-main'}`}>Apply</button>
                    </div>
                </div>
            </div>
             {customDateError && <p className="text-red-400 text-center text-sm mb-4">{customDateError}</p>}
            {renderContent()}
        </div>
    );
};

export default ReportingPage;
