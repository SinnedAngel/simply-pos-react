
import { useState, useEffect, useCallback } from 'react';
import { SaleReport } from '../../domain/entities';
import { SalesUseCases } from '../../domain/use-cases';

type PresetRange = 'today' | '7d' | '30d';
export type ActiveFilter = PresetRange | 'custom';
export type RangePayload = PresetRange | { startDate: string; endDate: string };

export const useReporting = (useCases: SalesUseCases) => {
  const [report, setReport] = useState<SaleReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('7d');

  const getDatesForRange = (range: PresetRange): { startDate: string; endDate: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    let startDate = new Date(today);
    const endDate = new Date(today); // Today is always the end date for ranges

    switch (range) {
      case 'today':
        // Start date is already today
        break;
      case '7d':
        startDate.setDate(today.getDate() - 6); // Today plus the previous 6 days
        break;
      case '30d':
        startDate.setDate(today.getDate() - 29); // Today plus the previous 29 days
        break;
    }
    
    // Format to YYYY-MM-DD string
    const toISOStringWithTimezone = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
      startDate: toISOStringWithTimezone(startDate),
      endDate: toISOStringWithTimezone(endDate),
    };
  };

  const fetchReport = useCallback(async (payload: RangePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      let dates: { startDate: string; endDate: string };
      if (typeof payload === 'string') {
        setActiveFilter(payload);
        dates = getDatesForRange(payload);
      } else {
        setActiveFilter('custom');
        dates = payload;
      }
      
      const fetchedReport = await useCases.getSalesReport(dates.startDate, dates.endDate);
      setReport(fetchedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching the report.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchReport('7d'); // Fetch default range on mount
  // The dependency array is intentionally empty, as we only want this to run once on mount.
  // The fetchReport function is memoized and will not change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return { report, isLoading, error, activeFilter, fetchReport };
};
