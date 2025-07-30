
import { Product, OrderItem, Order } from '../entities';
import { TAX_RATE } from '../config';

// --- USE CASE: Managing an Order ---
// Contains all business logic related to creating and modifying an order.
// This is pure, framework-agnostic logic.
export class OrderUseCases {
  private items: OrderItem[] = [];

  private calculateState(): Order {
    const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    // Return a new object to ensure immutability for state updates
    return { items: [...this.items], subtotal, tax, total };
  }

  getState(): Order {
    return this.calculateState();
  }

  addItem(product: Product): Order {
    const existingItem = this.items.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.items.push({ ...product, quantity: 1 });
    }
    return this.calculateState();
  }

  removeItem(productId: number): Order {
    this.items = this.items.filter(item => item.id !== productId);
    return this.calculateState();
  }

  updateItemQuantity(productId: number, newQuantity: number): Order {
    if (newQuantity <= 0) {
      return this.removeItem(productId);
    }
    const itemToUpdate = this.items.find(item => item.id === productId);
    if (itemToUpdate) {
      itemToUpdate.quantity = newQuantity;
    }
    return this.calculateState();
  }

  clearOrder(): Order {
    this.items = [];
    return this.calculateState();
  }
}
