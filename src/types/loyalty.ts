// src/types/loyalty.ts
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
const { Timestamp } = FirebaseFirestoreTypes;

export interface LoyaltyUser {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  isFirstTimeUser: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
  updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
  birthday?: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'bonus';
  description: string;
  timestamp: Timestamp;
  createdBy?: string;
}

export interface LoyaltyConfig {
  // Earning Rules
  pointsPerRupee: number; // Points earned per rupee spent
  minOrderAmount: number;
  eligibleOrderTypes: string[];
  
  // Redemption Rules
  redemptionRate: number; // How much 1 point is worth in rupees
  minRedemption: number;
  
  // Discount Rules
  flatDiscountPercentage: number; // 10% flat discount
  firstTimeDiscount: number; // ₹100 discount for first-time users
  
  // Bonus Rules
  birthdayBonusPoints: number;
  firstOrderMultiplier: number;
  festivalMultiplier: number;
}

export interface RedemptionCalculation {
  pointsToRedeem: number;
  discountAmount: number;
  remainingAmount: number;
  isValid: boolean;
  errorMessage?: string;
  pointsToNextReward?: number;
  nextRewardValue?: number;
}

export interface DiscountCalculation {
  discountAmount: number;
  discountType: 'flat_percentage' | 'points' | 'none' | 'first_time';
  isEligible: boolean;
  reasonNotEligible?: string;
  pointsUsed?: number;
  savingsMessage?: string;
}

export interface OrderBreakdown {
  originalAmount: number;
  discountApplied: number;
  finalAmount: number;
  pointsEarned: number;
  pointsUsed: number;
  discountType: 'flat_percentage' | 'points' | 'none' | 'first_time';
}

export interface OrderData {
  id: string;
  orderId: string;
  userId: string;
  items: any[];
  totalAmount: number;
  originalAmount: number;
  orderStatus: string;
  orderType: string;
  tableNumber: string | null;
  paymentMode: string;
  paymentStatus: string;
  description: string;
  createdAt: Date | Timestamp;
  baristaNotes: string | null;
  isRewardEarned: boolean;
  rating: number | null;
  mood: string | null;
  discountType: string;
  pointsUsed: number;
  discountValue: number;
  finalAmountPaid: number;
  loyaltyDetails: {
    pointsBeforeOrder: number;
    pointsEarned: number;
    pointsRedeemed: number;
    pointsAfterOrder: number;
    discountApplied: {
      type: string;
      amount: number;
      description: string;
    };
    amountDetails: {
      originalAmount: number;
      discountAmount: number;
      finalAmount: number;
    };
  };
}

export interface ComprehensiveLoyaltyTransaction {
  id: string;
  userId: string;
  userName: string;
  orderId: string;
  userDetails: {
    phoneNumber: string;
    email: string;
    isFirstTimeUser: boolean;
    totalOrdersBeforeThis: number;
    totalSpentBeforeThis: number;
  };
  orderDetails: {
    originalAmount: number;
    discountType: string;
    discountAmount: number;
    finalAmount: number;
    items: any[];
    orderType: string;
    tableNumber?: string;
    baristaNotes?: string;
  };
  loyaltyDetails: {
    pointsBeforeTransaction: number;
    pointsEarned: number;
    pointsRedeemed: number;
    pointsAfterTransaction: number;
    earningRate: number;
  };
  transactionDetails: {
    timestamp: Timestamp;
    paymentMode: string;
    status: string;
    staffId: string;
    notes: string;
  };
  createdBy: string;
  auditTrail?: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    updatedBy: string;
  };
}

export const LOYALTY_CONFIG: LoyaltyConfig = {
  // Earning Rules - 0.1 points per rupee spent (for every ₹1 paid, earn 0.1 points)
  pointsPerRupee: 0.1, // 0.1 points per ₹1 spent
  minOrderAmount: 100, // Minimum order amount to earn points
  eligibleOrderTypes: ['takeaway', 'dine-in', 'delivery'],
  
  // Redemption Rules - 1 point = ₹1 (changed from ₹10)
  redemptionRate: 1, // 1 point = ₹1
  minRedemption: 1, // minimum 1 point to redeem (₹1 value)
  
  // Discount Rules
  flatDiscountPercentage: 0.10, // 10% flat discount
  firstTimeDiscount: 100, // ₹100 discount for first-time users
  
  // Bonus Rules
  birthdayBonusPoints: 100, // 100 points = ₹100 value
  firstOrderMultiplier: 2, // 2x points for first order
  festivalMultiplier: 3
};