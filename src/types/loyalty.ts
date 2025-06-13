// src/types/loyalty.ts
import { Timestamp } from 'firebase/firestore';

export interface LoyaltyUser {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalOrders: number;
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