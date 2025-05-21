// src/types/interfaces.ts
export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  icon?: 'local-cafe' | 'coffee' | 'restaurant' | 'local-dining';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  prices: number[];
  imagelink_square: string;
  special_ingredient: string;
  type: string;
  description: string;
  average_rating: number;
  ratings_count: number;
  roasted: string;
  ingredients: string[];
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem extends Omit<Product, 'prices'> {
  prices: {
    size: string;
    price: string;
    currency: string;
    quantity: number;
  }[];
}

export interface OrderHistoryItem {
  OrderDate: string;
  CartList: CartItem[];
  CartListPrice: string;
}


export interface OrderData {
  userId: string;
  displayName : string;
  items: any[];
  totalAmount: number;
  orderType: string;
  tableNumber: string | null;
  paymentMode: string;
  paymentStatus: string;
  orderDate: string;
  createdAt: Date;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionUrl: string;
  actionText: string;
}
