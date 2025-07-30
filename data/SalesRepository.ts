import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderItemParam, RpcOrderLogItem, RpcSaleReport } from '../types';
import { ISalesRepository } from '../domain/ports';
import { Order, OrderLogItem, SaleReport } from '../domain/entities';

// --- ADAPTER: Sales Repository ---
// This class implements the ISalesRepository port. It adapts our data source (Supabase)
// to the interface required by our application's sales and reporting use cases.
export class SalesRepository implements ISalesRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

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
      throw new Error(`Failed to save order: ${error.message}`);
    }
  }

  async getSalesReport(startDate: string, endDate: string): Promise<SaleReport> {
    const { data, error } = await this.supabase.rpc('get_sales_report', {
        p_start_date: startDate,
        p_end_date: endDate,
    });
    
    if (error) {
        console.error("Error fetching sales report:", error);
        throw new Error(`Failed to fetch sales report: ${error.message}`);
    }

    if (!data) {
        // Return a default empty report if data is null/undefined
        return {
            totalRevenue: 0,
            orderCount: 0,
            avgOrderValue: 0,
            dailySales: [],
            topProducts: [],
        };
    }
    
    // The RPC returns a JSONB object that matches the RpcSaleReport type.
    // We cast it to ensure type safety.
    const reportData = data as unknown as RpcSaleReport;

    return {
        totalRevenue: reportData.totalRevenue || 0,
        orderCount: reportData.orderCount || 0,
        avgOrderValue: reportData.avgOrderValue || 0,
        dailySales: reportData.dailySales || [],
        topProducts: reportData.topProducts || [],
    };
  }

  async getOrderLog(startDate: string, endDate: string): Promise<OrderLogItem[]> {
    const { data, error } = await this.supabase.rpc('get_order_log', {
        p_start_date: startDate,
        p_end_date: endDate,
    });
    
    if (error) {
        console.error("Error fetching order log:", error);
        throw new Error(`Failed to fetch order log: ${error.message}`);
    }

    if (!data) return [];

    const logData = data as unknown as RpcOrderLogItem[];

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
}
