import { Order, OrderLogItem, SaleReport } from '../entities';
import { ISalesRepository } from '../ports';

// --- USE CASE: Managing Sales & Reporting ---
// This use case orchestrates creating sales records and fetching reports.
export class SalesUseCases {
  constructor(private salesRepository: ISalesRepository) {}

  async createOrder(order: Order, userId: string): Promise<void> {
    if (order.items.length === 0) {
      throw new Error('Cannot create an order with no items.');
    }
     if (!userId) {
      throw new Error('User ID is required to create an order.');
    }
    await this.salesRepository.createOrder(order, userId);
  }

  async getSalesReport(startDate: string, endDate: string): Promise<SaleReport> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for the report.');
    }
    return this.salesRepository.getSalesReport(startDate, endDate);
  }

  async getOrderLog(startDate: string, endDate: string): Promise<OrderLogItem[]> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for the log.');
    }
    return this.salesRepository.getOrderLog(startDate, endDate);
  }
}
