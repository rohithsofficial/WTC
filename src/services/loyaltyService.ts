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
  RedemptionCalculation,
  MembershipTier,
  TierConfig
} from '../types/loyalty';

export class LoyaltyService {
  
  // Calculate points earned from purchase amount
  static calculatePointsEarned(amount: number, multiplier: number = 1): number {
    if (amount < LOYALTY_CONFIG.minOrderAmount) return 0;
    return Math.floor(amount * LOYALTY_CONFIG.pointsPerRupee * multiplier);
  }

  // Calculate discount amount from points
  static calculateDiscountFromPoints(points: number): number {
    return points * LOYALTY_CONFIG.redemptionRate;
  }

  // Get user's current tier
  static getUserTier(points: number): TierConfig {
    return LOYALTY_CONFIG.tiers.reduce((currentTier, nextTier) => {
      return points >= nextTier.minPoints ? nextTier : currentTier;
    }, LOYALTY_CONFIG.tiers[0]);
  }

  // Calculate points expiry date
  static calculateExpiryDate(): Timestamp {
    const date = new Date();
    date.setMonth(date.getMonth() + LOYALTY_CONFIG.pointsValidityMonths);
    return Timestamp.fromDate(date);
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
    const maxDiscount = Math.min(
      orderAmount * LOYALTY_CONFIG.maxRedemptionPercentage,
      LOYALTY_CONFIG.maxRedemptionAmount
    );

    if (discountAmount > maxDiscount) {
      const maxPoints = Math.floor(maxDiscount / LOYALTY_CONFIG.redemptionRate);
      return {
        pointsToRedeem: maxPoints,
        discountAmount: maxDiscount,
        remainingAmount: orderAmount - maxDiscount,
        isValid: true,
        errorMessage: `Maximum discount is ₹${maxDiscount}. Using ${maxPoints} points instead.`
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
    displayName: string = 'User',
    isFirstOrder: boolean = false,
    isBirthday: boolean = false,
    isFestival: boolean = false
  ): Promise<{ pointsEarned: number; newBalance: number }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        
        let currentPoints = 0;
        let totalOrders = 0;
        let totalSpent = 0;
        let membershipTier: MembershipTier = 'Bronze';

        if (userSnap.exists()) {
          const userData = userSnap.data() as AppUser;
          currentPoints = userData.loyaltyPoints || 0;
          totalOrders = userData.totalOrders || 0;
          totalSpent = userData.totalSpent || 0;
          membershipTier = userData.membershipTier || 'Bronze';
        }

        // Calculate points multiplier based on conditions
        let multiplier = this.getUserTier(currentPoints).pointMultiplier;
        if (isFirstOrder) multiplier *= LOYALTY_CONFIG.firstOrderMultiplier;
        if (isFestival) multiplier *= LOYALTY_CONFIG.festivalMultiplier;

        // Calculate points earned (on the amount after discount)
        const pointsEarned = this.calculatePointsEarned(orderAmount, multiplier);
        
        // Add birthday bonus if applicable
        const birthdayBonus = isBirthday ? LOYALTY_CONFIG.birthdayBonusPoints : 0;
        
        // Update user points balance
        const newBalance = currentPoints - pointsRedeemed + pointsEarned + birthdayBonus;
        
        // Calculate new tier
        const newTier = this.getUserTier(newBalance).name;
        
        // Update user document
        const userUpdateData: Partial<AppUser> = {
          loyaltyPoints: newBalance,
          membershipTier: newTier,
          totalOrders: totalOrders + 1,
          totalSpent: totalSpent + orderAmount,
          lastPointsEarned: Timestamp.now(),
          pointsExpiryDate: this.calculateExpiryDate(),
          updatedAt: new Date().toISOString()
        };

        if (!userSnap.exists()) {
          // Create new user if doesn't exist
          const newUser: AppUser = {
            id: userId,
            displayName,
            email: '', // You might want to get this from auth
            loyaltyPoints: newBalance,
            membershipTier: newTier,
            totalOrders: 1,
            totalSpent: orderAmount,
            lastPointsEarned: Timestamp.now(),
            pointsExpiryDate: this.calculateExpiryDate(),
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
            description: `Earned ${pointsEarned} points from ₹${orderAmount} purchase${multiplier > 1 ? ` (${multiplier}x multiplier)` : ''}`,
            timestamp: Timestamp.now(),
            createdBy: userId,
            multiplier
          };

          const earnedRef = doc(loyaltyTransactionsRef);
          transaction.set(earnedRef, { ...earnedTransaction, id: earnedRef.id });
        }

        // Add birthday bonus transaction if applicable
        if (birthdayBonus > 0) {
          const bonusTransaction: Omit<LoyaltyTransaction, 'id'> = {
            userId,
            orderId,
            points: birthdayBonus,
            type: 'bonus',
            description: `Birthday bonus: ${birthdayBonus} points`,
            timestamp: Timestamp.now(),
            createdBy: userId
          };

          const bonusRef = doc(loyaltyTransactionsRef);
          transaction.set(bonusRef, { ...bonusTransaction, id: bonusRef.id });
        }

        return { pointsEarned: pointsEarned + birthdayBonus, newBalance };
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

  // Check for expiring points
  static async checkExpiringPoints(userId: string): Promise<{ points: number; daysUntilExpiry: number } | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as AppUser;
        if (userData.pointsExpiryDate) {
          const expiryDate = userData.pointsExpiryDate.toDate();
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= LOYALTY_CONFIG.expiryNotificationDays) {
            return {
              points: userData.loyaltyPoints,
              daysUntilExpiry
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking expiring points:', error);
      return null;
    }
  }
}