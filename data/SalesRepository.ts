
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderItemParam, RpcSaleReport } from '../types';
import { ISalesRepository } from '../domain/ports';
import { Order, SaleReport } from '../domain/entities';

// --- ADAPTER: Sales Repository ---
// This class implements the ISalesRepository port. It adapts our data source (Supabase)
// to the interface required by our application's sales and reporting use cases.
export class SalesRepository implements ISalesRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createOrder(order: Order): Promise<void> {
    const itemsToStore: OrderItemParam[] = order.items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
    }));
    
    const { error } = await this.supabase.rpc('create_order', {
      p_total: order.total,
      p_items: itemsToStore,
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
}
