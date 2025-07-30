
import React from 'react';
import { DailySale } from '../../domain/entities';

interface SalesChartProps {
  data: DailySale[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const chartHeight = 250;
  const chartWidth = 600; // This will be responsive via SVG viewBox
  const barPadding = 8;
  const barWidth = (chartWidth / data.length) - barPadding;
  
  const maxValue = Math.max(...data.map(d => d.total), 0);

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
          {data.map((d, i) => {
            const barHeight = maxValue > 0 ? (d.total / maxValue) * chartHeight : 0;
            const x = i * (barWidth + barPadding);
            const y = chartHeight - barHeight;

            return (
              <g key={d.date} className="bar-group">
                <title>{`Date: ${formatDate(d.date)}\nTotal: Rp ${d.total.toLocaleString('id-ID')}`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  className="transition-all duration-300 ease-out"
                  rx="4"
                />
                 {barWidth > 20 && (
                  <text
                    x={x + barWidth / 2}
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
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default SalesChart;
