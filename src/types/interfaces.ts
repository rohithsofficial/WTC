import { Timestamp } from "firebase/firestore";

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
  displayName: string;
  items: any[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  paymentMethod: string;
  orderType: string;
  tableNumber: string;
  status: string;
  timestamp: Date;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionUrl: string;
  actionText: string;
  displayOrder: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}


// phonepe integration

// src/types/interfaces.ts
export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  invoiceId: string;
  paymentMethod: string;
  paymentDetails: any;
  customerInfo: {
    userId: string;
    displayName: string;
    orderType: string;
    tableNumber: string;
  };
}

export interface PaymentResult {
  success: boolean;
  status: string;
  paymentId?: string;
  data?: {
    amount: number;
    merchantId: string;
    merchantTransactionId: string;
    orderId: string;
    paymentInstrument: { type: string };
    responseCode: string;
    state: string;
    transactionId: string;
    redirectUrl?: string;
  };
  error?: string;
}

export interface OrderData {
  userId: string;
  displayName: string;
  items: any[];
  totalAmount: number;
  orderType: string;
  tableNumber: string;
  orderStatus: string;
  paymentMode: string;
  paymentStatus: string;
  orderDate: string;
  createdAt: Date | Timestamp;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  gradientColors: [string, string];
  isActive: boolean;
}

export interface Notifications {
  id: string;
  title: string;
  message: string;
  timestamp: Timestamp;
  readAt?: Timestamp;
  isRead: boolean;
  isActive: boolean;
  type: "offer" | "order" | "system";
  userId: string;
}
