// src/services/loyaltyService.ts\import React, { useState, useEffect } from "react";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp,
  writeBatch,
  runTransaction,
  setDoc,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import type { 
  LoyaltyUser, 
  MembershipTier,
  LoyaltyTransaction,
  TierConfig,
  RedemptionCalculation,
  TierDiscountCalculation,
  LoyaltyConfig
} from '../types/loyalty';
import { LOYALTY_CONFIG } from '../types/loyalty';

// Ensure we're using the global Math object
const globalMath = Math;

interface RedemptionResult {
  userName: string;
  membershipTier: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  remainingPoints: number;
  error?: string;
}

interface RedemptionTransaction {
  id?: string;
  userId: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  membershipTier: MembershipTier;
  timestamp: Timestamp;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  orderId?: string;
  staffId?: string;
  notes?: string;
}

interface TierRequirement {
  minPoints: number;
  discountPercentage: number;
  maxDiscount: number;
  bonusDiscount?: number;
  earningMultiplier: number;
}

interface PointsTransaction {
  userId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'bonus' | 'tier_discount';
  description: string;
  timestamp: Timestamp;
  createdBy?: string;
  multiplier?: number;
}

class LoyaltyServiceClass {
  private readonly TIER_REQUIREMENTS: Record<MembershipTier, TierRequirement> = {
    Bronze: {
      minPoints: 0,
      discountPercentage: 2,
      maxDiscount: 20,
      earningMultiplier: 1
    },
    Silver: {
      minPoints: 500,
      discountPercentage: 5,
      maxDiscount: 75,
      earningMultiplier: 1.2
    },
    Gold: {
      minPoints: 1000,
      discountPercentage: 10,
      maxDiscount: 150,
      earningMultiplier: 1.5
    },
    Platinum: {
      minPoints: 2000,
      discountPercentage: 15,
      maxDiscount: 200,
      bonusDiscount: 50,
      earningMultiplier: 2
    }
  };

  async getUserProfile(userId: string): Promise<LoyaltyUser | null> {
    try {
      const userRef = doc(db, 'loyaltyUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as LoyaltyUser;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async createUserProfile(
    userData: Omit<LoyaltyUser, 'loyaltyPoints' | 'membershipTier' | 'createdAt' | 'updatedAt' | 'totalOrders'> & { totalOrders?: number },
    initialPoints: number = 0
  ): Promise<LoyaltyUser> {
    try {
      const userRef = doc(db, 'loyaltyUsers', userData.uid);
      const userProfile: LoyaltyUser = {
        ...userData,
        loyaltyPoints: initialPoints,
        membershipTier: this.determineMembershipTier(initialPoints),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalOrders: userData.totalOrders || 0
      };
      
      await setDoc(userRef, userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  async redeemPoints(userId: string, orderAmount: number): Promise<RedemptionResult> {
    try {
      // Validate inputs
      if (!userId || orderAmount <= 0) {
        throw new Error('Invalid user ID or order amount');
      }

      // Get user profile from users collection
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const currentPoints = userData.loyaltyPoints || 0;
      const membershipTier = userData.membershipTier || 'Bronze';
      const userName = userData.displayName || 'Customer';

      const tierDiscount = this.calculateTierDiscount(
        orderAmount,
        membershipTier,
        currentPoints
      );

      if (!tierDiscount.isEligible) {
        return {
          userName: userName,
          membershipTier: membershipTier,
          orderAmount,
          discountApplied: 0,
          pointsUsed: 0,
          remainingPoints: currentPoints,
          error: tierDiscount.reasonNotEligible
        };
      }

      // Use transaction for atomicity
      return await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const currentUserData = userDoc.data();
        const currentPoints = currentUserData.loyaltyPoints || 0;
        
        // Recalculate with current points to avoid race conditions
        const currentTierDiscount = this.calculateTierDiscount(
          orderAmount,
          currentUserData.membershipTier || 'Bronze',
          currentPoints
        );

        if (!currentTierDiscount.isEligible) {
          throw new Error(currentTierDiscount.reasonNotEligible || 'Not eligible for discount');
        }

        const pointsRequired = currentTierDiscount.pointsRequired || 0;
        const newPointsBalance = currentPoints - pointsRequired;
        
        // Update user's loyalty points in users collection
        transaction.update(userDocRef, {
          loyaltyPoints: newPointsBalance,
          updatedAt: Timestamp.now()
        });

        // Create redemption transaction record
        const transactionRef = doc(collection(db, 'redemptionTransactions'));
        const transactionData: Omit<RedemptionTransaction, 'id'> = {
          userId: userId,
          orderAmount,
          discountApplied: currentTierDiscount.discountAmount,
          pointsUsed: pointsRequired,
          membershipTier: currentUserData.membershipTier || 'Bronze',
          timestamp: Timestamp.now(),
          status: 'completed'
        };
        
        transaction.set(transactionRef, transactionData);

        // Create loyalty transaction for history
        const loyaltyTransactionRef = doc(collection(db, 'loyaltyTransactions'));
        const loyaltyTransactionData: Omit<LoyaltyTransaction, 'id'> = {
          userId: userId,
          points: -pointsRequired,
          type: 'tier_discount',
          description: `Tier discount applied - ₹${currentTierDiscount.discountAmount}`,
          timestamp: Timestamp.now()
        };
        
        transaction.set(loyaltyTransactionRef, loyaltyTransactionData);

        return {
          userName: currentUserData.displayName || 'Customer',
          membershipTier: currentUserData.membershipTier || 'Bronze',
          orderAmount,
          discountApplied: currentTierDiscount.discountAmount,
          pointsUsed: pointsRequired,
          remainingPoints: newPointsBalance
        };
      });
    } catch (error: any) {
      console.error('Error redeeming points:', error);
      throw new Error(error.message || 'Failed to redeem points');
    }
  }

  async awardPoints(userId: string, orderAmount: number, orderId?: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const tierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === userProfile.membershipTier);
      const multiplier = tierConfig?.pointMultiplier || 1;
      const pointsEarned = this.calculatePointsEarned(orderAmount, multiplier);
      
      if (pointsEarned <= 0) {
        console.log(`No points earned for order amount ₹${orderAmount} (below minimum)`);
        return;
      }

      const newPointsBalance = userProfile.loyaltyPoints + pointsEarned;
      const newTier = this.determineMembershipTier(newPointsBalance);

      await updateDoc(doc(db, 'loyaltyUsers', userProfile.uid), {
        loyaltyPoints: newPointsBalance,
        membershipTier: newTier,
        updatedAt: Timestamp.now()
      });

      // Create points transaction record
      const transaction: Omit<LoyaltyTransaction, 'id'> = {
        userId,
        points: pointsEarned,
        type: 'earned',
        description: orderId ? `Points earned from order #${orderId}` : `Points earned from purchase`,
        timestamp: Timestamp.now(),
        orderId,
        multiplier
      };

      await addDoc(collection(db, 'loyaltyTransactions'), transaction);

      // Check for tier upgrade
      if (newTier !== userProfile.membershipTier) {
        const bonusTransaction: Omit<LoyaltyTransaction, 'id'> = {
          userId,
          points: 0,
          type: 'bonus',
          description: `Congratulations! You've been upgraded to ${newTier} tier!`,
          timestamp: Timestamp.now()
        };
        
        await addDoc(collection(db, 'loyaltyTransactions'), bonusTransaction);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      throw new Error('Failed to award points');
    }
  }

  private determineMembershipTier(points: number): MembershipTier {
    if (points >= 2000) return 'Platinum';
    if (points >= 1000) return 'Gold';
    if (points >= 500) return 'Silver';
    return 'Bronze';
  }

  async getRedemptionHistory(userId: string, limitCount = 10): Promise<RedemptionTransaction[]> {
    try {
      const q = query(
        collection(db, 'redemptionTransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RedemptionTransaction[];
    } catch (error) {
      console.error('Error fetching redemption history:', error);
      throw new Error('Failed to fetch redemption history');
    }
  }

  async getLoyaltyHistory(userId: string, limitCount = 20): Promise<LoyaltyTransaction[]> {
    try {
      const q = query(
        collection(db, 'loyaltyTransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoyaltyTransaction[];
    } catch (error) {
      console.error('Error fetching loyalty history:', error);
      throw new Error('Failed to fetch loyalty history');
    }
  }

  getTierBenefits(tier: MembershipTier): string {
    const tierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === tier);
    if (!tierConfig) return 'No benefits available';

    return tierConfig.benefits.join('\n');
  }

  getNextTierProgress(currentTier: MembershipTier, currentPoints: number): { nextTier: MembershipTier | null; pointsNeeded: number } {
    const tiers: MembershipTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return { nextTier: null, pointsNeeded: 0 };
    }

    const nextTier = tiers[currentIndex + 1];
    const nextTierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === nextTier);
    
    if (!nextTierConfig) {
      return { nextTier: null, pointsNeeded: 0 };
    }

    const pointsNeeded = globalMath.max(0, nextTierConfig.minPoints - currentPoints);
    return { nextTier, pointsNeeded };
  }

  getNextRewardMilestone(currentPoints: number): { pointsNeeded: number; rewardValue: number } {
    // Calculate the next milestone for rewards (every 100 points = ₹10 reward)
    const rewardInterval = 100;
    const rewardValue = 10;
    
    const nextMilestone = globalMath.ceil(currentPoints / rewardInterval) * rewardInterval;
    const pointsNeeded = nextMilestone - currentPoints;
    
    return {
      pointsNeeded: pointsNeeded > 0 ? pointsNeeded : rewardInterval,
      rewardValue: rewardValue
    };
  }

  generateQRToken(userId: string): string {
    try {
      const tokenData = {
        userId,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        type: 'loyalty_qr'
      };
      
      return JSON.stringify(tokenData);
    } catch (error) {
      console.error('Error generating QR token:', error);
      throw new Error('Failed to generate QR token');
    }
  }

  validateQRToken(token: string): { isValid: boolean; userId?: string; error?: string } {
    try {
      // Basic validation
      if (!token || typeof token !== 'string') {
        return { isValid: false, error: 'Invalid token format' };
      }

      // Parse token
      const tokenData = JSON.parse(token);
      const now = Date.now();
      
      // Check token expiration
      if (tokenData.expiresAt && tokenData.expiresAt < now) {
        return { isValid: false, error: 'QR code expired' };
      }

      // Validate required fields
      if (!tokenData.userId || !tokenData.timestamp || !tokenData.type) {
        return { isValid: false, error: 'Invalid QR code data' };
      }

      // Validate token type
      if (tokenData.type !== 'loyalty_qr') {
        return { isValid: false, error: 'Invalid QR code type' };
      }

      // Validate timestamp (token should not be too old)
      const tokenAge = now - tokenData.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (tokenAge > maxAge) {
        return { isValid: false, error: 'QR code expired' };
      }

      return { isValid: true, userId: tokenData.userId };
    } catch (error) {
      return { isValid: false, error: 'Invalid QR code format' };
    }
  }

  // Calculate points earned from purchase amount
  calculatePointsEarned(amount: number, multiplier: number = 1): number {
    if (amount < LOYALTY_CONFIG.minOrderAmount) return 0;
    return globalMath.floor(amount * LOYALTY_CONFIG.pointsPerRupee * multiplier);
  }

  // Calculate discount amount from points
  calculateDiscountFromPoints(points: number): number {
    return globalMath.floor(points * LOYALTY_CONFIG.redemptionRate);
  }

  // Calculate tier-based discount
  calculateTierDiscount(
    orderAmount: number, 
    membershipTier: MembershipTier, 
    loyaltyPoints: number
  ): TierDiscountCalculation {
    // Minimum order value check
    if (orderAmount < LOYALTY_CONFIG.minOrderAmount) {
      return {
        discountAmount: 0,
        discountType: 'none',
        maxDiscountLimit: 0,
        isEligible: false,
        reasonNotEligible: `Minimum order value of ₹${LOYALTY_CONFIG.minOrderAmount} required`
      };
    }

    const tierConfig = LOYALTY_CONFIG.tiers.find(tier => tier.name === membershipTier);
    if (!tierConfig) {
      return {
        discountAmount: 0,
        discountType: 'none',
        maxDiscountLimit: 0,
        isEligible: false,
        reasonNotEligible: 'Invalid membership tier'
      };
    }

    let discount = 0;
    let maxCap = tierConfig.maxDiscountPerBill;
    let discountType: 'flat' | 'percentage' | 'combo' | 'none' = 'none';
    let pointsRequired = 0;

    // Set points required based on tier
    switch (membershipTier) {
      case 'Bronze':
        pointsRequired = 50; // Minimal points usage for Bronze
        break;
      case 'Silver':
        pointsRequired = 100; // Moderate points usage for Silver
        break;
      case 'Gold':
        pointsRequired = 150; // Higher points usage for Gold
        break;
      case 'Platinum':
        pointsRequired = 200; // Highest points usage for Platinum
        break;
    }

    // Check if user has enough points for the redemption
    if (loyaltyPoints < pointsRequired) {
      return {
        discountAmount: 0,
        discountType: 'none',
        maxDiscountLimit: maxCap,
        isEligible: false,
        reasonNotEligible: `Need ${pointsRequired} points for ${membershipTier} tier discount (you have ${loyaltyPoints})`
      };
    }

    // Calculate discount based on tier
    switch (membershipTier) {
      case 'Bronze':
        // Bronze: Flat ₹10 or 2% discount (whichever is lower), max ₹20
        const flatDiscount = 10;
        const percentageDiscount = globalMath.floor(orderAmount * 0.02);
        discount = globalMath.min(flatDiscount, percentageDiscount, maxCap);
        discountType = flatDiscount <= percentageDiscount ? 'flat' : 'percentage';
        break;

      case 'Silver':
        // Silver: 5% discount, max ₹75
        discount = globalMath.min(globalMath.floor(orderAmount * 0.05), maxCap);
        discountType = 'percentage';
        break;

      case 'Gold':
        // Gold: 10% discount, max ₹150
        discount = globalMath.min(globalMath.floor(orderAmount * 0.10), maxCap);
        discountType = 'percentage';
        break;

      case 'Platinum':
        // Platinum: 15% discount + ₹50 bonus, max ₹200
        const baseDiscount = globalMath.floor(orderAmount * 0.15);
        const bonusDiscount = this.TIER_REQUIREMENTS.Platinum.bonusDiscount || 0;
        discount = globalMath.min(baseDiscount + bonusDiscount, maxCap);
        discountType = 'combo';
        break;
    }

    return {
      discountAmount: discount,
      discountType,
      maxDiscountLimit: maxCap,
      isEligible: discount > 0,
      pointsRequired,
      reasonNotEligible: discount > 0 ? undefined : 'No discount available for this order'
    };
  }

  // Calculate redemption
  calculateRedemption(
    pointsToRedeem: number,
    availablePoints: number,
    orderAmount: number
  ): RedemptionCalculation {
    // Validate points
    if (pointsToRedeem <= 0) {
      return {
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: 'Please enter a valid number of points'
      };
    }

    if (pointsToRedeem > availablePoints) {
      return {
        pointsToRedeem,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: 'Insufficient points'
      };
    }

    if (pointsToRedeem < LOYALTY_CONFIG.minRedemption) {
      return {
        pointsToRedeem,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: `Minimum ${LOYALTY_CONFIG.minRedemption} points required for redemption`
      };
    }

    // Calculate discount amount
    const discountAmount = globalMath.floor(pointsToRedeem * LOYALTY_CONFIG.redemptionRate);
    
    // Apply maximum discount limits
    const maxDiscount = globalMath.floor(orderAmount * LOYALTY_CONFIG.maxRedemptionPercentage);
    const finalDiscount = globalMath.min(discountAmount, maxDiscount, LOYALTY_CONFIG.maxRedemptionAmount);
    
    // Calculate remaining amount
    const remainingAmount = orderAmount - finalDiscount;

    return {
      pointsToRedeem,
      discountAmount: finalDiscount,
      remainingAmount,
      isValid: true,
      maxDiscountAmount: LOYALTY_CONFIG.maxRedemptionAmount
    };
  }

  async getUserLoyaltyPoints(userId: string): Promise<number> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        // Check if there are any existing transactions
        const transactions = await this.getLoyaltyHistory(userId);
        let totalPoints = 0;
        
        // Calculate points from transaction history
        for (const transaction of transactions) {
          if (transaction.type === 'earned' || transaction.type === 'bonus') {
            totalPoints += Math.abs(transaction.points);
          } else if (transaction.type === 'redeemed') {
            totalPoints -= Math.abs(transaction.points);
          }
          // Don't subtract points for tier_discount transactions as they're already accounted for
        }

        // Ensure points are never negative
        totalPoints = Math.max(0, totalPoints);

        // Create a new user profile with calculated points
        const userData = {
          uid: userId,
          displayName: auth.currentUser?.displayName || 'User',
          // Only include email if it exists and is not null
          ...(auth.currentUser?.email && { email: auth.currentUser.email }),
          // Only include phone if it exists and is not null
          ...(auth.currentUser?.phoneNumber && { phone: auth.currentUser.phoneNumber })
        };
        
        const newProfile = await this.createUserProfile(userData, totalPoints);
        return newProfile.loyaltyPoints;
      }
      // Ensure existing profile points are never negative
      return Math.max(0, userProfile.loyaltyPoints);
    } catch (error) {
      console.error('Error getting user loyalty points:', error);
      throw new Error('Failed to get user loyalty points');
    }
  }

  // Get best available discount
  getBestAvailableDiscount(
    orderAmount: number,
    membershipTier: MembershipTier,
    availablePoints: number,
    pointsToRedeem: number
  ): {
    tierDiscount: TierDiscountCalculation;
    pointsRedemption: RedemptionCalculation;
    recommendedOption: 'tier' | 'points' | 'none';
  } {
    const tierDiscount = this.calculateTierDiscount(orderAmount, membershipTier, availablePoints);
    const pointsRedemption = this.calculateRedemption(pointsToRedeem, availablePoints, orderAmount);

    // If neither option is valid, return none
    if (!tierDiscount.isEligible && !pointsRedemption.isValid) {
      return {
        tierDiscount,
        pointsRedemption,
        recommendedOption: 'none'
      };
    }

    // If only one option is valid, recommend that one
    if (!tierDiscount.isEligible) {
      return {
        tierDiscount,
        pointsRedemption,
        recommendedOption: 'points'
      };
    }

    if (!pointsRedemption.isValid) {
      return {
        tierDiscount,
        pointsRedemption,
        recommendedOption: 'tier'
      };
    }

    // If both are valid, recommend the one with higher discount
    return {
      tierDiscount,
      pointsRedemption,
      recommendedOption: tierDiscount.discountAmount > pointsRedemption.discountAmount ? 'tier' : 'points'
    };
  }

  // Process order completion
  async processOrderCompletion(
    userId: string,
    orderId: string,
    orderAmount: number,
    pointsRedeemed: number,
    tierDiscount: number,
    userName: string,
    isFirstOrder: boolean,
    isBirthday: boolean,
    isFestival: boolean
  ): Promise<void> {
    try {
      const userRef = doc(db, 'loyaltyUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data() as LoyaltyUser;
      const currentPoints = Math.max(0, userData.loyaltyPoints || 0);
      const membershipTier = userData.membershipTier || 'Bronze';

      // Calculate points earned
      let pointsEarned = this.calculatePointsEarned(orderAmount);
      
      // Apply multipliers
      if (isFirstOrder) {
        pointsEarned *= LOYALTY_CONFIG.firstOrderMultiplier;
      }
      if (isBirthday) {
        pointsEarned += LOYALTY_CONFIG.birthdayBonusPoints;
      }
      if (isFestival) {
        pointsEarned *= LOYALTY_CONFIG.festivalMultiplier;
      }

      // Ensure points earned is never negative
      pointsEarned = Math.max(0, pointsEarned);

      // Calculate final points, ensuring it never goes negative
      const finalPoints = Math.max(0, currentPoints + pointsEarned - pointsRedeemed);

      // Update user's points
      await updateDoc(doc(db, 'loyaltyUsers', userData.uid), {
        loyaltyPoints: finalPoints,
        updatedAt: Timestamp.now()
      });

      // Create loyalty transaction
      const transaction: Omit<LoyaltyTransaction, 'id'> = {
        userId,
        points: pointsEarned - pointsRedeemed,
        type: pointsRedeemed > 0 ? 'redeemed' : 'earned',
        description: `Order #${orderId}`,
        timestamp: Timestamp.now(),
        orderId
      };

      const transactionRef = await addDoc(collection(db, 'loyaltyTransactions'), transaction);

      // If points were redeemed, create redemption transaction
      if (pointsRedeemed > 0) {
        const redemptionTransaction: RedemptionTransaction = {
          userId,
          orderAmount,
          discountApplied: tierDiscount,
          pointsUsed: pointsRedeemed,
          membershipTier,
          timestamp: Timestamp.now(),
          status: 'completed',
          orderId
        };

        await addDoc(collection(db, 'redemptionTransactions'), redemptionTransaction);
      }
    } catch (error) {
      console.error('Error processing order completion:', error);
      throw new Error('Failed to process order completion');
    }
  }
}

// Create and export a singleton instance
const loyaltyServiceInstance = new LoyaltyServiceClass();
export const LoyaltyService = loyaltyServiceInstance;