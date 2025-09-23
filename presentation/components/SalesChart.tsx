import React from 'react';
import { DailySale } from '../../domain/entities';

interface SalesChartProps {
  salesData: DailySale[];
  expensesData: DailySale[];
}

const SalesChart: React.FC<SalesChartProps> = ({ salesData, expensesData }) => {
  const chartHeight = 250;
  const chartWidth = 1000; // This will be responsive via SVG viewBox

  // Combine and get unique dates
  const allDates = [...new Set([...salesData.map(d => d.date), ...expensesData.map(d => d.date)])].sort();
  
  const salesMap = new Map(salesData.map(d => [d.date, d.total]));
  const expensesMap = new Map(expensesData.map(d => [d.date, d.total]));

  const combinedData = allDates.map(date => ({
    date,
    sales: salesMap.get(date) || 0,
    expenses: expensesMap.get(date) || 0,
  }));

  const barGroupPadding = 12;
  const barGroupWidth = (chartWidth / combinedData.length) - barGroupPadding;
  const barWidth = barGroupWidth / 2;
  
  const maxValue = Math.max(...combinedData.map(d => Math.max(d.sales, d.expenses)), 0);

  // Function to format date from 'YYYY-MM-DD' to 'DD MMM'
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  
  return (
    <div className="relative w-full h-64">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <g className="chart-bars">
          {combinedData.map((d, i) => {
            const salesBarHeight = maxValue > 0 ? (d.sales / maxValue) * chartHeight : 0;
            const expensesBarHeight = maxValue > 0 ? (d.expenses / maxValue) * chartHeight : 0;

            const xGroup = i * (barGroupWidth + barGroupPadding);
            const ySales = chartHeight - salesBarHeight;
            const yExpenses = chartHeight - expensesBarHeight;

            return (
              <g key={d.date} className="bar-group">
                <title>{`Date: ${formatDate(d.date)}\nRevenue: Rp ${d.sales.toLocaleString('id-ID')}\nExpenses: Rp ${d.expenses.toLocaleString('id-ID')}`}</title>
                
                {/* Sales Bar */}
                <rect
                  x={xGroup}
                  y={ySales}
                  width={barWidth}
                  height={salesBarHeight}
                  fill="url(#salesGradient)"
                  className="transition-all duration-300 ease-out"
                  rx="3"
                />
                
                {/* Expenses Bar */}
                 <rect
                  x={xGroup + barWidth}
                  y={yExpenses}
                  width={barWidth}
                  height={expensesBarHeight}
                  fill="url(#expensesGradient)"
                  className="transition-all duration-300 ease-out"
                  rx="3"
                />

                 {barGroupWidth > 30 && (
                  <text
                    x={xGroup + barGroupWidth / 2}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fill="#D1D5DB"
                    fontSize="12"
                  >
                    {formatDate(d.date)}
                  </text>
                 )}
              </g>
            );
          })}
        </g>
        <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default SalesChart;
