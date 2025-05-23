export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
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

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  displayName: string;
  favorites: string[];
  createdAt: string;
  updatedAt: string;
} 