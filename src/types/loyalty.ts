// src/types/loyalty.ts
import { Timestamp } from 'firebase/firestore';

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired' | 'bonus' | 'tier_discount';
  description: string;
  timestamp: Timestamp;
  createdBy?: string;
  multiplier?: number; // For bonus points
}

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  loyaltyPoints: number;
  totalOrders?: number;
  totalSpent?: number;
  membershipTier: MembershipTier;
  lastPointsEarned?: Timestamp;
  pointsExpiryDate?: Timestamp;
  createdAt: string;
  updatedAt: string;
  birthday?: string;
}

export interface LoyaltyConfig {
  // Earning Rules
  pointsPerRupee: number;
  minOrderAmount: number;
  eligibleOrderTypes: string[];
  
  // Redemption Rules
  redemptionRate: number;
  minRedemption: number;
  maxRedemptionPercentage: number;
  maxRedemptionAmount: number;
  
  // Tier Rules
  tiers: TierConfig[];
  
  // Expiry Rules
  pointsValidityMonths: number;
  expiryNotificationDays: number;
  
  // Bonus Rules
  birthdayBonusPoints: number;
  firstOrderMultiplier: number;
  festivalMultiplier: number;
}

export interface TierConfig {
  name: MembershipTier;
  minPoints: number;
  pointMultiplier: number;
  perks: string[];
  color: string;
  benefits: string[];
}

export type MembershipTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface RedemptionCalculation {
  pointsToRedeem: number;
  discountAmount: number;
  remainingAmount: number;
  isValid: boolean;
  errorMessage?: string;
  pointsToNextReward?: number;
  nextRewardValue?: number;
}

// NEW: Interface for tier-based discount calculations
export interface TierDiscountCalculation {
  discountAmount: number;
  discountType: 'flat' | 'percentage' | 'combo' | 'none';
  maxDiscountLimit: number;
  isEligible: boolean;
  reasonNotEligible?: string;
  pointsRequired?: number;
  savingsMessage?: string;
}

export const LOYALTY_CONFIG: LoyaltyConfig = {
  // Earning Rules
  pointsPerRupee: 0.1, // 1 point per ₹10
  minOrderAmount: 100, // Minimum order amount to earn points
  eligibleOrderTypes: ['takeaway', 'dine-in', 'delivery'],
  
  // Redemption Rules
  redemptionRate: 0.1, // 100 points = ₹10
  minRedemption: 100, // minimum 100 points to redeem
  maxRedemptionPercentage: 0.2, // max 20% of order can be paid with points
  maxRedemptionAmount: 50, // maximum ₹50 discount per order
  
  // Tier Rules
  tiers: [
    {
      name: 'Bronze',
      minPoints: 0,
      pointMultiplier: 1,
      perks: ['Earn 1x points', 'Tier discount eligible at 100+ points'],
      color: '#CD7F32', // Bronze color
      benefits: [
        'Earn 1x points on all purchases',
        'Flat ₹10 or 2% discount (max ₹20) when you have 100+ points'
      ]
    },
    {
      name: 'Silver',
      minPoints: 500,
      pointMultiplier: 1.2,
      perks: ['Earn 1.2x points', 'Birthday bonus', '5% tier discount'],
      color: '#C0C0C0', // Silver color
      benefits: [
        'Earn 1.2x points on all purchases',
        'Birthday bonus points',
        '5% discount on all orders (max ₹50)'
      ]
    },
    {
      name: 'Gold',
      minPoints: 1000,
      pointMultiplier: 1.5,
      perks: ['Earn 1.5x points', 'Priority orders', 'Birthday bonus', '10% tier discount'],
      color: '#FFD700', // Gold color
      benefits: [
        'Earn 1.5x points on all purchases',
        'Priority order processing',
        'Birthday bonus points',
        '10% discount on all orders (max ₹100)'
      ]
    },
    {
      name: 'Platinum',
      minPoints: 2000,
      pointMultiplier: 2,
      perks: ['Earn 2x points', 'Priority orders', 'Exclusive discounts', 'Birthday bonus', '15% + ₹50 combo discount'],
      color: '#E5E4E2', // Platinum color
      benefits: [
        'Earn 2x points on all purchases',
        'Priority order processing',
        'Exclusive member discounts',
        'Birthday bonus points',
        '15% + ₹50 combo discount on all orders (max ₹200)'
      ]
    }
  ],
  
  // Expiry Rules
  pointsValidityMonths: 12,
  expiryNotificationDays: 30,
  
  // Bonus Rules
  birthdayBonusPoints: 100,
  firstOrderMultiplier: 2,
  festivalMultiplier: 3
};