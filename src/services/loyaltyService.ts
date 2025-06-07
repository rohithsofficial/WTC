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
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  LoyaltyTransaction, 
  LoyaltyUser, 
  LOYALTY_CONFIG, 
  RedemptionCalculation,
  MembershipTier,
  TierConfig,
  TierDiscountCalculation
} from '../types/loyalty';
import { auth } from '../firebase/config';

export class LoyaltyService {
  
  // Calculate points earned from purchase amount
  static calculatePointsEarned(amount: number, multiplier: number = 1): number {
    if (amount < LOYALTY_CONFIG.minOrderAmount) return 0;
    return Math.floor(amount * LOYALTY_CONFIG.pointsPerRupee * multiplier);
  }

  // Calculate discount amount from points (existing logic)
  static calculateDiscountFromPoints(points: number): number {
    return points * LOYALTY_CONFIG.redemptionRate;
  }

  // NEW: Calculate tier-based discount
  static calculateTierDiscount(
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

    let discount = 0;
    let maxCap = 0;
    let discountType: 'flat' | 'percentage' | 'combo' | 'none' = 'none';
    let minPointsRequired = 0;

    switch (membershipTier) {
      case 'Bronze':
        minPointsRequired = 100;
        if (loyaltyPoints >= minPointsRequired) {
          // Flat ₹10 or 2% (whichever is lower)
          const flatDiscount = 10;
          const percentageDiscount = 0.02 * orderAmount;
          discount = Math.min(flatDiscount, percentageDiscount);
          maxCap = 20;
          discountType = 'flat';
        }
        break;

      case 'Silver':
        minPointsRequired = 500;
        if (loyaltyPoints >= minPointsRequired) {
          // 5% discount
          discount = 0.05 * orderAmount;
          maxCap = 50;
          discountType = 'percentage';
        }
        break;

      case 'Gold':
        minPointsRequired = 1000;
        if (loyaltyPoints >= minPointsRequired) {
          // 10% discount
          discount = 0.10 * orderAmount;
          maxCap = 100;
          discountType = 'percentage';
        }
        break;

      case 'Platinum':
        minPointsRequired = 2000;
        if (loyaltyPoints >= minPointsRequired) {
          // 15% + ₹50 combo discount
          discount = (0.15 * orderAmount) + 50;
          maxCap = 200;
          discountType = 'combo';
        }
        break;

      default:
        discount = 0;
        maxCap = 0;
    }

    const finalDiscount = Math.min(discount, maxCap);
    const isEligible = loyaltyPoints >= minPointsRequired;

    return {
      discountAmount: finalDiscount,
      discountType,
      maxDiscountLimit: maxCap,
      isEligible,
      reasonNotEligible: !isEligible ? 
        `Need ${minPointsRequired} points for ${membershipTier} tier discount (you have ${loyaltyPoints})` : 
        undefined,
      pointsRequired: minPointsRequired,
      savingsMessage: finalDiscount > 0 ? 
        `You saved ₹${finalDiscount.toFixed(2)} with your ${membershipTier} membership!` : 
        undefined
    };
  }

  // NEW: Get best available discount (tier vs points redemption)
  static getBestAvailableDiscount(
    orderAmount: number,
    membershipTier: MembershipTier,
    availablePoints: number,
    pointsToRedeem?: number
  ): {
    tierDiscount: TierDiscountCalculation;
    pointsRedemption: RedemptionCalculation;
    recommendedOption: 'tier' | 'points' | 'none';
    combinedSavings?: number;
  } {
    const tierDiscount = this.calculateTierDiscount(orderAmount, membershipTier, availablePoints);
    const pointsRedemption = pointsToRedeem ? 
      this.calculateRedemption(pointsToRedeem, availablePoints, orderAmount) :
      { pointsToRedeem: 0, discountAmount: 0, remainingAmount: orderAmount, isValid: false };

    let recommendedOption: 'tier' | 'points' | 'none' = 'none';
    
    if (tierDiscount.isEligible && pointsRedemption.isValid) {
      // If both are available, recommend the one with higher savings
      recommendedOption = tierDiscount.discountAmount >= pointsRedemption.discountAmount ? 'tier' : 'points';
    } else if (tierDiscount.isEligible) {
      recommendedOption = 'tier';
    } else if (pointsRedemption.isValid) {
      recommendedOption = 'points';
    }

    return {
      tierDiscount,
      pointsRedemption,
      recommendedOption,
      combinedSavings: tierDiscount.discountAmount + pointsRedemption.discountAmount
    };
  }

  // Get user's current tier
  static getUserTier(points: number): TierConfig {
    return LOYALTY_CONFIG.tiers.reduce((currentTier, nextTier) => {
      return points >= nextTier.minPoints ? nextTier : currentTier;
    }, LOYALTY_CONFIG.tiers[0]);
  }

 static getNextTier(points: number): TierConfig | null {
  const tiers = LOYALTY_CONFIG.tiers;

  // Find the first tier whose minPoints is greater than user's points
  const nextTier = tiers.find(tier => points < tier.minPoints);

  // If no such tier exists, user is in the highest tier
  return nextTier || null;
}

  // Validate and calculate redemption (existing logic)
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
        const userData = userSnap.data() as LoyaltyUser;
        return userData.loyaltyPoints || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting user loyalty points:', error);
      return 0;
    }
  }

  // UPDATED: Process order completion with tier discount option
  static async processOrderCompletion(
    userId: string,
    orderId: string,
    orderAmount: number,
    pointsRedeemed: number = 0,
    tierDiscountUsed: number = 0,
    displayName: string = 'User',
    isFirstOrder: boolean = false,
    isBirthday: boolean = false,
    isFestival: boolean = false
  ): Promise<{ pointsEarned: number; newBalance: number; tierDiscountApplied: number }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        
        let currentPoints = 0;
        let membershipTier: MembershipTier = 'Bronze';
        let displayNameFromDb = displayName || 'User';
        let emailFromDb = '';
        let createdAt: Timestamp = Timestamp.now();
        let updatedAt: Timestamp = Timestamp.now();

        if (userSnap.exists()) {
          const userData = userSnap.data() as LoyaltyUser;
          currentPoints = userData.loyaltyPoints || 0;
          membershipTier = userData.membershipTier || 'Bronze';
          displayNameFromDb = userData.displayName || displayName || 'User';
          emailFromDb = userData.email || '';
          createdAt = userData.createdAt || Timestamp.now();
          updatedAt = userData.updatedAt || Timestamp.now();
        }

        // Calculate points multiplier based on conditions
        let multiplier = this.getUserTier(currentPoints).pointMultiplier;
        if (isFirstOrder) multiplier *= LOYALTY_CONFIG.firstOrderMultiplier;
        if (isFestival) multiplier *= LOYALTY_CONFIG.festivalMultiplier;

        // Calculate points earned (on the amount after all discounts)
        const amountAfterDiscounts = Math.max(0, orderAmount - pointsRedeemed * LOYALTY_CONFIG.redemptionRate - tierDiscountUsed);
        const pointsEarned = this.calculatePointsEarned(amountAfterDiscounts, multiplier);
        
        // Add birthday bonus if applicable
        const birthdayBonus = isBirthday ? LOYALTY_CONFIG.birthdayBonusPoints : 0;
        
        // Update user points balance
        const newBalance = currentPoints - pointsRedeemed + pointsEarned + birthdayBonus;
        
        // Calculate new tier
        const newTier = this.getUserTier(newBalance).name;
        
        // Update user document
        const userUpdateData: Partial<LoyaltyUser> = {
          loyaltyPoints: newBalance,
          membershipTier: newTier,
          displayName: displayNameFromDb,
          email: emailFromDb,
          updatedAt: Timestamp.now()
        };

        if (!userSnap.exists()) {
          // Create new user if doesn't exist
          const newUser: LoyaltyUser = {
            uid: userId,
            displayName: displayNameFromDb,
            email: emailFromDb,
            loyaltyPoints: newBalance,
            membershipTier: newTier,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
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

        // NEW: Add tier discount transaction if tier discount was used
        if (tierDiscountUsed > 0) {
          const tierDiscountTransaction: Omit<LoyaltyTransaction, 'id'> = {
            userId,
            orderId,
            points: 0, // No points deducted for tier discount
            type: 'tier_discount',
            description: `${membershipTier} tier discount: ₹${tierDiscountUsed} off`,
            timestamp: Timestamp.now(),
            createdBy: userId
          };
          
          const tierDiscountRef = doc(loyaltyTransactionsRef);
          transaction.set(tierDiscountRef, { ...tierDiscountTransaction, id: tierDiscountRef.id });
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

        return { 
          pointsEarned: pointsEarned + birthdayBonus, 
          newBalance,
          tierDiscountApplied: tierDiscountUsed
        };
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
  static async getUserProfile(userId: string): Promise<LoyaltyUser | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData) {
          return userData as LoyaltyUser;
        }
      } else {
        // Create new loyalty profile if it doesn't exist
        const authUser = auth.currentUser;
        if (!authUser) return null;

        const newUser: LoyaltyUser = {
          uid: userId,
          displayName: authUser.displayName || 'New User',
          email: authUser.email || '',
          phone: authUser.phoneNumber || '',
          loyaltyPoints: 0,
          membershipTier: 'Bronze',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await setDoc(userRef, newUser);
        return newUser;
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

  // NEW: Get next tier upgrade info
  static getNextTierUpgrade(currentPoints: number): { 
    currentTier: TierConfig; 
    nextTier: TierConfig | null; 
    pointsNeeded: number; 
    progressPercentage: number; 
  } {
    const currentTier = this.getUserTier(currentPoints);
    const currentTierIndex = LOYALTY_CONFIG.tiers.findIndex(tier => tier.name === currentTier.name);
    const nextTier = currentTierIndex < LOYALTY_CONFIG.tiers.length - 1 ? 
      LOYALTY_CONFIG.tiers[currentTierIndex + 1] : null;
    
    if (!nextTier) {
      return {
        currentTier,
        nextTier: null,
        pointsNeeded: 0,
        progressPercentage: 100
      };
    }

    const pointsNeeded = nextTier.minPoints - currentPoints;
    const progressPercentage = Math.min(
      ((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100,
      100
    );

    return {
      currentTier,
      nextTier,
      pointsNeeded: Math.max(pointsNeeded, 0),
      progressPercentage
    };
  }
}