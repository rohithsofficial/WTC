// src/services/loyaltyService.ts
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  LoyaltyTransaction, 
  AppUser, 
  LOYALTY_CONFIG, 
  RedemptionCalculation 
} from '../types/loyalty';

export class LoyaltyService {
  
  // Calculate points earned from purchase amount
  static calculatePointsEarned(amount: number): number {
    return Math.floor(amount * LOYALTY_CONFIG.pointsPerRupee);
  }

  // Calculate discount amount from points
  static calculateDiscountFromPoints(points: number): number {
    return points * LOYALTY_CONFIG.redemptionRate;
  }

  // Validate and calculate redemption
  static calculateRedemption(
    pointsToRedeem: number, 
    availablePoints: number, 
    orderAmount: number
  ): RedemptionCalculation {
    if (pointsToRedeem < 0) {
      return {
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: 'Points cannot be negative'
      };
    }

    if (pointsToRedeem > availablePoints) {
      return {
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: `You only have ${availablePoints} points available`
      };
    }

    if (pointsToRedeem < LOYALTY_CONFIG.minRedemption && pointsToRedeem > 0) {
      return {
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: orderAmount,
        isValid: false,
        errorMessage: `Minimum ${LOYALTY_CONFIG.minRedemption} points required for redemption`
      };
    }

    const discountAmount = this.calculateDiscountFromPoints(pointsToRedeem);
    const maxDiscount = orderAmount * LOYALTY_CONFIG.maxRedemptionPercentage;

    if (discountAmount > maxDiscount) {
      const maxPoints = Math.floor(maxDiscount / LOYALTY_CONFIG.redemptionRate);
      return {
        pointsToRedeem: maxPoints,
        discountAmount: maxDiscount,
        remainingAmount: orderAmount - maxDiscount,
        isValid: true,
        errorMessage: `Maximum ${Math.floor(LOYALTY_CONFIG.maxRedemptionPercentage * 100)}% of order can be paid with points. Using ${maxPoints} points instead.`
      };
    }

    return {
      pointsToRedeem,
      discountAmount,
      remainingAmount: orderAmount - discountAmount,
      isValid: true
    };
  }

  // Get user's current loyalty points
  static async getUserLoyaltyPoints(userId: string): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as AppUser;
        return userData.loyaltyPoints || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting user loyalty points:', error);
      return 0;
    }
  }

  // Process order completion with loyalty points
  static async processOrderCompletion(
    userId: string,
    orderId: string,
    orderAmount: number,
    pointsRedeemed: number = 0,
    displayName: string = 'User'
  ): Promise<{ pointsEarned: number; newBalance: number }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        
        let currentPoints = 0;
        let totalOrders = 0;
        let totalSpent = 0;

        if (userSnap.exists()) {
          const userData = userSnap.data() as AppUser;
          currentPoints = userData.loyaltyPoints || 0;
          totalOrders = userData.totalOrders || 0;
          totalSpent = userData.totalSpent || 0;
        }

        // Calculate points earned (on the amount after discount)
        const pointsEarned = this.calculatePointsEarned(orderAmount);
        
        // Update user points balance
        const newBalance = currentPoints - pointsRedeemed + pointsEarned;
        
        // Update user document
        const userUpdateData: Partial<AppUser> = {
          loyaltyPoints: newBalance,
          totalOrders: totalOrders + 1,
          totalSpent: totalSpent + orderAmount,
          updatedAt: new Date().toISOString()
        };

        if (!userSnap.exists()) {
          // Create new user if doesn't exist
          const newUser: AppUser = {
            id: userId,
            displayName,
            email: '', // You might want to get this from auth
            loyaltyPoints: newBalance,
            totalOrders: 1,
            totalSpent: orderAmount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          transaction.set(userRef, newUser);
        } else {
          transaction.update(userRef, userUpdateData);
        }

        // Create loyalty transactions
        const loyaltyTransactionsRef = collection(db, 'loyaltyTransactions');
        
        // Add redemption transaction if points were redeemed
        if (pointsRedeemed > 0) {
          const redemptionTransaction: Omit<LoyaltyTransaction, 'id'> = {
            userId,
            orderId,
            points: -pointsRedeemed,
            type: 'redeemed',
            description: `Redeemed ${pointsRedeemed} points for ₹${this.calculateDiscountFromPoints(pointsRedeemed)} discount`,
            timestamp: Timestamp.now(),
            createdBy: userId
          };
          
          const redemptionRef = doc(loyaltyTransactionsRef);
          transaction.set(redemptionRef, { ...redemptionTransaction, id: redemptionRef.id });
        }

        // Add earned points transaction
        if (pointsEarned > 0) {
          const earnedTransaction: Omit<LoyaltyTransaction, 'id'> = {
            userId,
            orderId,
            points: pointsEarned,
            type: 'earned',
            description: `Earned ${pointsEarned} points from ₹${orderAmount} purchase`,
            timestamp: Timestamp.now(),
            createdBy: userId
          };

          const earnedRef = doc(loyaltyTransactionsRef);
          transaction.set(earnedRef, { ...earnedTransaction, id: earnedRef.id });
        }

        return { pointsEarned, newBalance };
      });
    } catch (error) {
      console.error('Error processing order completion:', error);
      throw error;
    }
  }

  // Get user's loyalty transaction history
  static async getLoyaltyHistory(userId: string): Promise<LoyaltyTransaction[]> {
    try {
      const q = query(
        collection(db, 'loyaltyTransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: LoyaltyTransaction[] = [];
      
      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() } as LoyaltyTransaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting loyalty history:', error);
      return [];
    }
  }

  // Get user's complete profile
  static async getUserProfile(userId: string): Promise<AppUser | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as AppUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Calculate next reward milestone
  static getNextRewardMilestone(currentPoints: number): { pointsNeeded: number; rewardValue: number } {
    const milestones = [100, 250, 500, 1000, 2000];
    
    for (const milestone of milestones) {
      if (currentPoints < milestone) {
        return {
          pointsNeeded: milestone - currentPoints,
          rewardValue: this.calculateDiscountFromPoints(milestone)
        };
      }
    }
    
    // If user has more than highest milestone, calculate next 500 point increment
    const nextMilestone = Math.ceil(currentPoints / 500) * 500 + 500;
    return {
      pointsNeeded: nextMilestone - currentPoints,
      rewardValue: this.calculateDiscountFromPoints(nextMilestone)
    };
  }
}