import { Order, OrderLogItem, SaleReport, OpenOrder } from '../entities';
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

  // --- Open Table Use Cases ---
  async getOpenOrders(): Promise<OpenOrder[]> {
    return this.salesRepository.getOpenOrders();
  }

  async saveOpenOrder(tableNumber: string, order: Order, userId: string): Promise<void> {
    if (!tableNumber || tableNumber.trim().length === 0) {
      throw new Error('A table number or name is required.');
    }
    if (order.items.length === 0) {
      throw new Error('Cannot save an empty order to a table.');
    }
    if (!userId) {
      throw new Error('A user session is required to save an order.');
    }
    await this.salesRepository.saveOpenOrder(tableNumber.trim(), order, userId);
  }

  async closeOpenOrder(tableNumber: string): Promise<void> {
    if (!tableNumber || tableNumber.trim().length === 0) {
      throw new Error('A table number is required to close an order.');
    }
    await this.salesRepository.closeOpenOrder(tableNumber);
  }
}