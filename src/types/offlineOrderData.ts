// src/interfaces/OrderData.ts

export interface OrderItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string;
  customizations?: string[];
  image?: string;
}

export interface DiscountApplied {
  type: string;
  amount: number;
  description: string;
}

export interface AmountDetails {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface LoyaltyDetails {
  pointsBeforeOrder: number;
  pointsRedeemed: number;
  pointsAfterOrder: number;
  pointsEarned: number;
  discountApplied: DiscountApplied;
  amountDetails: AmountDetails;
}

export interface OrderData {
  // Core Order Information
  id: string;
  orderId: string; // Human-readable order ID
  userId: string;
  
  // Order Items
  items: any[];
  
  // Pricing Information
  originalAmount: number;
  totalAmount: number;
  finalAmountPaid: number;
  discountValue: number;
  pointsUsed: number;
  
  // Discount Information
  discountType: string;
  
  // Payment Information
  paymentMode: string;
  paymentStatus: string;
  
  // Order Status
  orderStatus: string;
  orderType: string;
  
  // Location Information
  tableNumber: string | null;
  
  // Additional Information
  description: string;
  baristaNotes: string | null;
  
  // Timestamps
  createdAt: any;
  updatedAt?: any;
  completedAt?: any;
  
  // Reward and Rating
  isRewardEarned: boolean;
  rating: number | null; // 1-5 stars
  mood: string | null;
  
  // Loyalty Program Details
  loyaltyDetails: LoyaltyDetails;
  
  // Special Flags
  isOfflineOrder: boolean;
  
  // Customer Information (for offline orders)
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  
  // Staff Information
  staffId?: string;
  staffName?: string;
  
  // Delivery Information (if applicable)
  deliveryInfo?: {
    address: string;
    landmark?: string;
    phone: string;
    estimatedTime?: number; // minutes
    deliveryFee: number;
  };
  
  // Special Instructions
  specialInstructions?: string;
  
  // Refund Information (if applicable)
  refundInfo?: {
    refundAmount: number;
    refundReason: string;
    refundedAt: any;
    refundMode: string;
  };
}

// Additional interfaces for order management
export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topItems: {
    itemName: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface OrderFilters {
  status?: OrderData['orderStatus'];
  type?: OrderData['orderType'];
  paymentMode?: OrderData['paymentMode'];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  staffId?: string;
}

// Utility types for order operations
export type CreateOrderData = Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderData = Partial<Pick<OrderData, 
  'orderStatus' | 'paymentStatus' | 'baristaNotes' | 'rating' | 'mood' | 'completedAt'
>>;

// Export the main interface as default
export default OrderData;