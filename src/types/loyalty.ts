// src/types/loyalty.ts
import { Timestamp } from 'firebase/firestore';

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted';
  description: string;
  timestamp: Timestamp;
  createdBy?: string;
}

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  loyaltyPoints: number;
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyConfig {
  pointsPerRupee: number; // 1 point per ₹10 = 0.1
  redemptionRate: number; // 100 points = ₹10 = 0.1
  minRedemption: number; // minimum points to redeem
  maxRedemptionPercentage: number; // max % of order that can be paid with points
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

export const LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerRupee: 0.1, // 1 point per ₹10
  redemptionRate: 0.1, // 100 points = ₹10
  minRedemption: 50, // minimum 50 points to redeem
  maxRedemptionPercentage: 0.5, // max 50% of order can be paid with points
};