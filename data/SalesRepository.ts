import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderItemParam, RpcOrderLogItem, RpcOpenOrder, RpcSaleReport, RpcPurchaseLogItem } from '../types';
import { ISalesRepository } from '../domain/ports';
import { Order, OrderLogItem, OpenOrder, SaleReport, PurchaseLogItem } from '../domain/entities';

// --- ADAPTER: Sales Repository ---
// This class implements the ISalesRepository port. It adapts our data source (Supabase)
// to the interface required by our application's sales and reporting use cases.
export class SalesRepository implements ISalesRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private getErrorMessage(error: any, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && error.message) {
      let message = String(error.message);
      if (error.details) {
        message += ` Details: ${String(error.details)}`;
      }
      if (error.hint) {
        message += ` Hint: ${String(error.hint)}`;
      }
      return message;
    }
    return defaultMessage;
  }

  async createOrder(order: Order, userId: string): Promise<void> {
    const itemsToStore: OrderItemParam[] = order.items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
    }));
    
    const { error } = await this.supabase.rpc('create_order', {
      p_total: order.total,
      p_items: itemsToStore,
      p_user_id: userId,
    });

    if (error) {
      console.error("Error creating order:", error);
      throw new Error(`Failed to save order: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
  }

  async getSalesReport(startDate: string, endDate: string): Promise<SaleReport> {
    const { data, error } = await this.supabase.rpc('get_sales_report', {
        p_start_date: startDate,
        p_end_date: endDate,
    });
    
    if (error) {
        console.error("Error fetching sales report:", error);
        throw new Error(`Failed to fetch sales report: ${this.getErrorMessage(error, 'Unknown error')}`);
    }

    if (!data) {
        // Return a default empty report if data is null/undefined
        return {
            totalRevenue: 0,
            orderCount: 0,
            avgOrderValue: 0,
            dailySales: [],
            topProducts: [],
            totalExpenses: 0,
            netProfit: 0,
            dailyExpenses: [],
        };
    }
    
    const reportData = data as RpcSaleReport;

    return {
        totalRevenue: reportData.totalRevenue || 0,
        orderCount: reportData.orderCount || 0,
        avgOrderValue: reportData.avgOrderValue || 0,
        dailySales: reportData.dailySales || [],
        topProducts: reportData.topProducts || [],
        totalExpenses: reportData.totalExpenses || 0,
        netProfit: reportData.netProfit || 0,
        dailyExpenses: reportData.dailyExpenses || [],
    };
  }

  async getOrderLog(startDate: string, endDate: string): Promise<OrderLogItem[]> {
    const { data, error } = await this.supabase.rpc('get_order_log', {
        p_start_date: startDate,
        p_end_date: endDate,
    });
    
    if (error) {
        console.error("Error fetching order log:", error);
        throw new Error(`Failed to fetch order log: ${this.getErrorMessage(error, 'Unknown error')}`);
    }

    if (!data) return [];

    const logData = data as RpcOrderLogItem[];

    return logData.map(item => ({
        orderId: item.order_id,
        createdAt: item.created_at,
        total: item.total,
        cashierUsername: item.cashier_username,
        items: item.items.map(p => ({
            productName: p.productName,
            quantity: p.quantity,
            price: p.price,
        })),
    }));
  }

  async getPurchaseLog(startDate: string, endDate: string): Promise<PurchaseLogItem[]> {
    const { data, error } = await this.supabase.rpc('get_purchase_log', {
        p_start_date: startDate,
        p_end_date: endDate,
    });
    
    if (error) {
        console.error("Error fetching purchase log:", error);
        throw new Error(`Failed to fetch purchase log: ${this.getErrorMessage(error, 'Unknown error')}`);
    }

    if (!data) return [];

    const logData = data as RpcPurchaseLogItem[];

    return logData.map(item => ({
        id: item.id,
        createdAt: item.created_at,
        totalCost: item.total_cost,
        userName: item.cashier_username,
        ingredientName: item.ingredient_name,
        quantityPurchased: item.quantity_purchased,
        unit: item.unit,
        supplier: item.supplier,
        notes: item.notes,
    }));
  }

  // --- Open Orders Methods ---
  async getOpenOrders(): Promise<OpenOrder[]> {
    const { data, error } = await this.supabase.rpc('get_all_open_orders');
    if (error) {
        console.error("Error fetching open orders:", error);
        throw new Error(`Failed to fetch open orders: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
    if (!data) return [];

    const openOrderData = data as RpcOpenOrder[];

    return openOrderData.map(item => ({
        tableNumber: item.table_number,
        order: item.order_data as Order, // Trusting the DB to return valid Order JSON
    }));
  }

  async saveOpenOrder(tableNumber: string, order: Order, userId: string): Promise<void> {
      const { error } = await this.supabase.rpc('save_open_order', {
          p_order_data: order as any, // Cast to any for Supabase JSONB
          p_table_number: tableNumber,
          p_user_id: userId,
      });

      if (error) {
          console.error("Error saving open order:", error);
          throw new Error(`Failed to save order for table ${tableNumber}: ${this.getErrorMessage(error, 'Unknown error')}`);
      }
  }

  async closeOpenOrder(tableNumber: string): Promise<void> {
      const { error } = await this.supabase.rpc('close_open_order', {
          p_table_number: tableNumber,
      });
      if (error) {
          console.error("Error closing open order:", error);
          throw new Error(`Failed to close order for table ${tableNumber}: ${this.getErrorMessage(error, 'Unknown error')}`);
      }
  }
}
