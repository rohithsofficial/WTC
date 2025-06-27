// src/services/loyaltyService.ts
import firestore, { 
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
  limit,
  onSnapshot,
  Unsubscribe,
  increment
} from '@react-native-firebase/firestore';
import { db, auth } from '../firebase/firebase-config';
import type { 
  LoyaltyUser, 
  LoyaltyConfig
} from '../types/loyalty';
import { LOYALTY_CONFIG } from '../types/loyalty';

// Interfaces
export interface UserLoyaltyProfile {
  userId: string;
  userName: string;
  availablePoints: number;
  totalOrders: number;
  totalSpent: number;
  isFirstTimeUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  userId: string;
  type: 'earned' | 'redeemed' | 'bonus';
  points: number;
  description: string;
  timestamp: Timestamp;
  orderId?: string;
}

// NEW: Comprehensive Loyalty Transaction Interface
export interface ComprehensiveLoyaltyTransaction {
  id?: string;
  userId: string;
  userName: string;
  orderId: string;
  
  // User Details
  userDetails: {
    phoneNumber?: string;
    email?: string;
    isFirstTimeUser: boolean;
    totalOrdersBeforeThis: number;
    totalSpentBeforeThis: number;
  };
  
  // Order Details
  orderDetails: {
    originalAmount: number;
    discountType: 'flat_percentage' | 'first_time' | 'points' | 'none';
    discountAmount: number;
    finalAmount: number;
    items: any[];
    orderType: string;
    tableNumber?: string;
    baristaNotes?: string;
  };
  
  // Loyalty Points Details
  loyaltyDetails: {
    pointsBeforeTransaction: number;
    pointsEarned: number;
    pointsRedeemed: number;
    pointsAfterTransaction: number;
    earningRate: number;
  };
  
  // Transaction Details
  transactionDetails: {
    timestamp: Timestamp;
    paymentMode: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    staffId?: string;
    notes?: string;
  };
  
  // Audit Trail
  auditTrail: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    updatedBy?: string;
  };
}

export interface RedemptionCalculation {
  pointsToRedeem: number;
  discountAmount: number;
  remainingAmount: number;
  isValid: boolean;
}

export interface DiscountCalculation {
  discountAmount: number;
  discountType: 'flat_percentage' | 'first_time' | 'none';
  isEligible: boolean;
}

export interface OrderBreakdown {
  originalAmount: number;
  discountApplied: number;
  pointsUsed: number;
  finalAmount: number;
  pointsEarned: number;
  discountType: 'flat_percentage' | 'first_time' | 'points' | 'none';
}

export interface DiscountRecommendation {
  type: 'points' | 'flat_percentage' | 'first_time' | 'none';
  description: string;
  savings: number;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface LoyaltyResult {
  pointsEarned: number;
  pointsUsed: number;
  newBalance: number;
}

interface RedemptionResult {
  userName: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  remainingPoints: number;
  finalAmount: number;
  pointsEarned: number;
  discountType: 'flat_percentage' | 'points' | 'first_time';
  error?: string;
  isFirstTimeUser?: boolean;
}

interface RedemptionTransaction {
  id?: string;
  userId: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  finalAmount: number;
  pointsEarned: number;
  discountType: 'flat_percentage' | 'points' | 'first_time';
  timestamp: Timestamp;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  orderId?: string;
  staffId?: string;
  notes?: string;
}

interface PointsTransaction {
  userId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'bonus';
  description: string;
  timestamp: Timestamp;
  createdBy?: string;
}

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  totalSaved: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  currentPoints: number;
}

interface OrderData {
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
  createdAt: Timestamp;
  baristaNotes: string | null;
  isRewardEarned: boolean;
  rating: null;
  mood: null;
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

interface UserTransaction {
  id: string;
  userId: string;
  originalAmount: number;
  discountType: string;
  pointsUsed: number;
  discountValue: number;
  finalAmountPaid: number;
  pointsEarned: number;
  timestamp: Timestamp;
  description: string;
  items?: any[];
  orderType?: string;
  tableNumber?: string;
  baristaNotes?: string;
  loyaltyDetails?: any;
}

export class LoyaltyServiceClass {
  private readonly POINTS_EARNING_RATE = 0.1; // 0.1 points per ₹1
  private readonly FLAT_DISCOUNT_PERCENTAGE = 10; // 10% flat discount
  private readonly FIRST_TIME_DISCOUNT = 100; // ₹100 off for first-time users
  private readonly MIN_ORDER_AMOUNT = 100; // Minimum order amount for discounts

  // Add points earning rate as a class property
  readonly pointsEarningRate: number = 0.1; // 1 point ₹10 rupee spent

  // Get user's current loyalty points
  async getUserPoints(userId: string): Promise<number> {
    try {
      if (!userId?.trim()) {
        throw new Error('User ID is required');
      }

      // Check both collections
      const userRef = doc(db, 'users', userId);
      const loyaltyUserRef = doc(db, 'loyaltyUsers', userId);
      
      const [userDoc, loyaltyUserDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(loyaltyUserRef)
      ]);
      
      // Get points from both documents
      const userPoints = userDoc.exists() ? userDoc.data()?.loyaltyPoints || 0 : 0;
      const loyaltyPoints = loyaltyUserDoc.exists() ? loyaltyUserDoc.data()?.loyaltyPoints || 0 : 0;
      
      // If points are different, sync them
      if (userPoints !== loyaltyPoints) {
        const correctPoints = Math.max(userPoints, loyaltyPoints);
        
        // Update both collections with the correct points
        const batch = writeBatch(db);
        if (userDoc.exists()) {
          batch.update(userRef, { loyaltyPoints: correctPoints });
        }
        if (loyaltyUserDoc.exists()) {
          batch.update(loyaltyUserRef, { loyaltyPoints: correctPoints });
        }
        await batch.commit();
        
        return correctPoints;
      }
      
      return userPoints;
    } catch (error) {
      console.error('Error fetching user points:', error);
      throw new Error('Failed to fetch user points');
    }
  }

  // Add realtime listener for loyalty points
  subscribeToLoyaltyPoints(
    userId: string,
    callback: (points: number) => void
  ): Unsubscribe {
    if (!userId) {
      console.warn('subscribeToLoyaltyPoints: userId is required');
      return () => {};
    }

    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const points = userData?.loyaltyPoints || 0;
          callback(points);
        } else {
          callback(0);
        }
      }, 
      (error) => {
        console.error('Error in loyalty points subscription:', error);
        callback(0);
      },
      () => {
        console.log('Loyalty points listener completed');
      }
    );
  }

  // Add realtime listener for user profile
  subscribeToUserProfile(
    userId: string,
    callback: (profile: UserLoyaltyProfile | null) => void
  ): Unsubscribe {
    if (!userId) {
      console.warn('subscribeToUserProfile: userId is required');
      return () => {};
    }

    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const profile: UserLoyaltyProfile = {
            userId: userData?.userId || userId,
            userName: userData?.displayName || 'Guest',
            availablePoints: userData?.loyaltyPoints || 0,
            totalOrders: userData?.totalOrders || 0,
            totalSpent: userData?.totalSpent || 0,
            isFirstTimeUser: userData?.isFirstTimeUser ?? true,
            createdAt: userData?.createdAt instanceof Timestamp ? userData?.createdAt.toDate() : new Date(),
            updatedAt: userData?.updatedAt instanceof Timestamp ? userData?.updatedAt.toDate() : new Date()
          };
          callback(profile);
        } else {
          callback(null);
        }
      }, 
      (error) => {
        console.error('Error in user profile subscription:', error);
        callback(null);
      },
      () => {
        console.log('User profile listener completed');
      }
    );
  }

  // Get user profile from loyaltyUsers collection
  async getUserProfile(userId: string): Promise<LoyaltyUser | null> {
    try {
      if (!userId?.trim()) {
        throw new Error('User ID is required');
      }

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

  // Get complete user loyalty profile with current points
  async getUserLoyaltyProfile(userId: string): Promise<UserLoyaltyProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          userId: userData?.userId || userId,
          userName: userData?.displayName || userData?.userName || 'Guest',
          availablePoints: userData?.loyaltyPoints || 0,
          totalOrders: userData?.totalOrders || 0,
          totalSpent: userData?.totalSpent || 0,
          isFirstTimeUser: userData?.isFirstTimeUser ?? true,
          createdAt: userData?.createdAt instanceof Timestamp ? userData?.createdAt.toDate() : new Date(),
          updatedAt: userData?.updatedAt instanceof Timestamp ? userData?.updatedAt.toDate() : new Date()
        };
      }

      // If user doesn't exist, create a new profile
      const newProfile: UserLoyaltyProfile = {
        userId: userId,
        userName: 'Guest',
        availablePoints: 0,
        totalOrders: 0,
        totalSpent: 0,
        isFirstTimeUser: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create the profile in the database
      await setDoc(userRef, {
        ...newProfile,
        loyaltyPoints: 0,
        totalSpent: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return newProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  // Create new user profile in loyaltyUsers collection
  async createUserProfile(
    userData: Omit<LoyaltyUser, 'loyaltyPoints' | 'createdAt' | 'updatedAt' | 'totalOrders'> & { totalOrders?: number },
    initialPoints: number = 0
  ): Promise<LoyaltyUser> {
    try {
      if (!userData.uid?.trim()) {
        throw new Error('User UID is required');
      }

      const userRef = doc(db, 'loyaltyUsers', userData.uid);
      const userProfile: LoyaltyUser = {
        ...userData,
        loyaltyPoints: Math.max(0, initialPoints),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalOrders: Math.max(0, userData.totalOrders || 0)
      };
      
      await setDoc(userRef, userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  // Update user profile in loyaltyUsers collection
  async updateUserLoyaltyProfile(userId: string, updates: Partial<UserLoyaltyProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  // Calculate points redemption
  calculateRedemption(availablePoints: number, orderAmount: number, pointsToRedeem: number): RedemptionCalculation {
    const maxRedeemablePoints = Math.min(availablePoints, orderAmount);
    const actualPointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);
    
    return {
      pointsToRedeem: actualPointsToRedeem,
      discountAmount: actualPointsToRedeem,
      remainingAmount: orderAmount - actualPointsToRedeem,
      isValid: actualPointsToRedeem > 0 && actualPointsToRedeem <= availablePoints
    };
  }

  // Calculate flat percentage discount
  calculateFlatDiscount(orderAmount: number): DiscountCalculation {
    const isEligible = orderAmount >= this.MIN_ORDER_AMOUNT;
    const discountAmount = isEligible ? (orderAmount * this.FLAT_DISCOUNT_PERCENTAGE) / 100 : 0;
    
    return {
      discountAmount,
      discountType: 'flat_percentage',
      isEligible
    };
  }

  // Calculate first time user discount
  calculateFirstTimeDiscount(orderAmount: number): DiscountCalculation {
    const discountAmount = Math.min(this.FIRST_TIME_DISCOUNT, orderAmount);
    
    return {
      discountAmount,
      discountType: 'first_time',
      isEligible: true
    };
  }

  // FIXED: Calculate order breakdown with proper first-time user handling
 calculateOrderBreakdown(
  orderAmount: number,
  discountType: 'flat_percentage' | 'first_time' | 'points' | 'none',
  pointsToRedeem: number = 0,
  isFirstTimeUser: boolean = false
): OrderBreakdown {
  let discountApplied = 0;
  let pointsUsed = 0;
  let finalAmount = orderAmount;
  let actualDiscountType = discountType;

  // Apply discounts based on type
  if (discountType === 'first_time' && isFirstTimeUser) {
    const firstTimeDiscount = this.calculateFirstTimeDiscount(orderAmount);
    discountApplied = firstTimeDiscount.discountAmount;
    finalAmount = orderAmount - discountApplied;
    actualDiscountType = 'first_time';
  } else if (discountType === 'points' && pointsToRedeem > 0) {
    pointsUsed = pointsToRedeem;
    discountApplied = pointsToRedeem;
    finalAmount = orderAmount - pointsToRedeem;
    actualDiscountType = 'points';
  } else if (discountType === 'flat_percentage' && orderAmount >= this.MIN_ORDER_AMOUNT) {
    const flatDiscount = this.calculateFlatDiscount(orderAmount);
    discountApplied = flatDiscount.discountAmount;
    finalAmount = orderAmount - discountApplied;
    actualDiscountType = 'flat_percentage';
  } else {
    // No discount applied
    actualDiscountType = 'none';
  }

  // FIXED: Calculate points earned based on finalAmount for ALL discount types
  // Points are always earned on the amount customer actually pays
  const pointsEarned = Math.round(finalAmount * this.POINTS_EARNING_RATE);

  return {
    originalAmount: orderAmount,
    discountApplied,
    pointsUsed,
    finalAmount,
    pointsEarned,
    discountType: actualDiscountType
  };
}

  // FIXED: Get best discount recommendation with proper first-time user priority
  getBestDiscountRecommendation(
    orderAmount: number,
    availablePoints: number,
    isFirstTimeUser: boolean
  ): DiscountRecommendation {
    // First-time users get priority for their discount
    if (isFirstTimeUser) {
      const firstTimeDiscount = Math.min(this.FIRST_TIME_DISCOUNT, orderAmount);
      return {
        type: 'first_time',
        description: `Get ₹${firstTimeDiscount} off as a first-time user!`,
        savings: firstTimeDiscount
      };
    }

    const flatDiscount = this.calculateFlatDiscount(orderAmount);
    const pointsDiscount = Math.min(availablePoints, orderAmount);

    if (pointsDiscount > flatDiscount.discountAmount && pointsDiscount > 0) {
      return {
        type: 'points',
        description: `Use ${pointsDiscount} points to save ₹${pointsDiscount}`,
        savings: pointsDiscount
      };
    }

    if (flatDiscount.isEligible) {
      return {
        type: 'flat_percentage',
        description: `Get 10% off (₹${flatDiscount.discountAmount})`,
        savings: flatDiscount.discountAmount
      };
    }

    return {
      type: 'none',
      description: 'No discounts available',
      savings: 0
    };
  }

  // FIXED: Validate discount selection with proper first-time user validation
  validateDiscountSelection(
    discountType: 'flat_percentage' | 'first_time' | 'points' | 'none',
    pointsToRedeem: number,
    availablePoints: number,
    orderAmount: number,
    isFirstTimeUser: boolean
  ): ValidationResult {
    if (discountType === 'first_time') {
      if (!isFirstTimeUser) {
        return {
          isValid: false,
          errorMessage: 'First-time discount is only available for new users'
        };
      }
      return { isValid: true };
    }

    if (discountType === 'points') {
      if (pointsToRedeem <= 0) {
        return {
          isValid: false,
          errorMessage: 'Please select points to redeem'
        };
      }
      if (pointsToRedeem > availablePoints) {
        return {
          isValid: false,
          errorMessage: 'Not enough points available'
        };
      }
      if (pointsToRedeem > orderAmount) {
        return {
          isValid: false,
          errorMessage: 'Cannot redeem more points than order amount'
        };
      }
    }

    if (discountType === 'flat_percentage' && orderAmount < this.MIN_ORDER_AMOUNT) {
      return {
        isValid: false,
        errorMessage: `Order must be at least ₹${this.MIN_ORDER_AMOUNT} for flat discount`
      };
    }

    return { isValid: true };
  }

  // FIXED: Process order with proper first-time user handling
 async processOrder(
  userId: string,
  amount: number,
  finalAmount: number,
  discountType: string,
  pointsUsed: number = 0,
  isFirstTimeUser: boolean = false
): Promise<{ pointsEarned: number; newBalance: number }> {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get user data from both collections
      const userRef = doc(db, 'users', userId);
      const loyaltyUserRef = doc(db, 'loyaltyUsers', userId);
      
      const [userDoc, loyaltyUserDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(loyaltyUserRef)
      ]);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentPoints = userData?.loyaltyPoints || 0;
      
      // Calculate points earned based on final amount
      const pointsEarned = Math.floor(finalAmount * this.pointsEarningRate);
      const newBalance = currentPoints + pointsEarned - pointsUsed;

      // Update both collections
      transaction.update(userRef, {
        loyaltyPoints: newBalance,
        totalOrders: increment(1),
        totalSpent: increment(finalAmount),
        isFirstTimeUser: false,
        updatedAt: Timestamp.now()
      });

      if (loyaltyUserDoc.exists()) {
        transaction.update(loyaltyUserRef, {
          loyaltyPoints: newBalance,
          totalOrders: increment(1),
          totalSpent: increment(finalAmount),
          isFirstTimeUser: false,
          updatedAt: Timestamp.now()
        });
      }

      return { pointsEarned, newBalance };
    });
  } catch (error) {
    console.error('Error processing order:', error);
    throw new Error('Failed to process order');
  }
}

  // NEW: Create comprehensive loyalty transaction record
  async loyaltyTransaction(
    transactionData: Omit<ComprehensiveLoyaltyTransaction, 'id' | 'auditTrail'> & {
      createdBy: string;
    }
  ): Promise<string> {
    try {
      // Create a clean copy of the data with null values for undefined fields
      const cleanData = {
        ...transactionData,
        orderDetails: {
          ...transactionData.orderDetails,
          tableNumber: transactionData.orderDetails.tableNumber || '',
          baristaNotes: transactionData.orderDetails.baristaNotes || ''
        },
        userDetails: {
          ...transactionData.userDetails,
          phoneNumber: transactionData.userDetails.phoneNumber || '',
          email: transactionData.userDetails.email || ''
        },
        transactionDetails: {
          ...transactionData.transactionDetails,
          staffId: transactionData.transactionDetails.staffId || '',
          notes: transactionData.transactionDetails.notes || ''
        }
      };

      const comprehensiveTransaction: Omit<ComprehensiveLoyaltyTransaction, 'id'> = {
        ...cleanData,
        auditTrail: {
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: transactionData.createdBy,
        }
      };

      const transactionRef = collection(db, 'loyaltyTransactions');
      const docRef = await addDoc(transactionRef, comprehensiveTransaction);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating comprehensive loyalty transaction:', error);
      throw new Error('Failed to create comprehensive loyalty transaction');
    }
  }

  // NEW: Get comprehensive loyalty transactions for a user
  async getComprehensiveLoyaltyTransactions(
    userId: string,
    limitCount: number = 50
  ): Promise<ComprehensiveLoyaltyTransaction[]> {
    try {
      const transactionsRef = collection(db, 'loyaltyTransactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        orderBy('transactionDetails.timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ComprehensiveLoyaltyTransaction[];
    } catch (error) {
      console.error('Error fetching comprehensive loyalty transactions:', error);
      throw new Error('Failed to fetch comprehensive loyalty transactions');
    }
  }

  // NEW: Subscribe to comprehensive loyalty transactions
  subscribeToComprehensiveLoyaltyTransactions(
    userId: string,
    callback: (transactions: ComprehensiveLoyaltyTransaction[]) => void,
    limitCount: number = 50
  ): Unsubscribe {
    if (!userId) {
      console.warn('subscribeToComprehensiveLoyaltyTransactions: userId is required');
      return () => {};
    }

    const transactionsRef = collection(db, 'loyaltyTransactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('transactionDetails.timestamp', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ComprehensiveLoyaltyTransaction[];
        callback(transactions);
      }, 
      (error) => {
        console.error('Error in comprehensive loyalty transactions subscription:', error);
        callback([]);
      },
      () => {
        console.log('Comprehensive loyalty transactions listener completed');
      }
    );
  }

  // UPDATED: Create transaction record with comprehensive tracking
  async createTransactionRecord(
  orderId: string,
  userId: string,
  transaction: {
    originalAmount: number;
    discountType: string;
    pointsUsed: number;
    discountValue: number;
    finalAmountPaid: number;
    pointsEarned: number;
    timestamp: Date;
    description: string;
    items?: any[];
    orderType?: string;
    tableNumber?: string;
    baristaNotes?: string;
  }
): Promise<OrderData> {
  try {
    // Get current user data BEFORE creating transaction
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    if (!userData) {
      throw new Error('User not found');
    }

    // FIXED: Get points before transaction (current balance before this order)
    const pointsBeforeOrder = userData.loyaltyPoints || 0;
    
    // FIXED: Calculate points after transaction correctly
    // pointsAfterOrder = pointsBeforeOrder + pointsEarned - pointsUsed
    const pointsAfterOrder = pointsBeforeOrder + transaction.pointsEarned - transaction.pointsUsed;

    // Create order record in orders collection
    const orderData: OrderData = {
      id: orderId,
      orderId: orderId,
      userId: userId,
      items: transaction.items || [],
      totalAmount: transaction.originalAmount,
      originalAmount: transaction.originalAmount,
      paymentStatus: "Paid",
      orderStatus: 'Order Placed',
      description: transaction.description,
      orderType: transaction.orderType || 'regular',
      tableNumber: transaction.tableNumber || null,
      paymentMode: 'loyalty',
      createdAt: Timestamp.fromDate(transaction.timestamp),
      baristaNotes: transaction.baristaNotes || null,
      isRewardEarned: transaction.pointsEarned > 0,
      rating: null,
      mood: null,
      discountType: transaction.discountType,
      pointsUsed: transaction.pointsUsed,
      discountValue: transaction.discountValue,
      finalAmountPaid: transaction.finalAmountPaid,
      loyaltyDetails: {
        pointsBeforeOrder: pointsBeforeOrder, // FIXED: Correct points before
        pointsEarned: transaction.pointsEarned, // Points earned on final amount
        pointsRedeemed: transaction.pointsUsed, // Points used for discount
        pointsAfterOrder: pointsAfterOrder, // FIXED: Correct calculation
        discountApplied: {
          type: transaction.discountType,
          amount: transaction.discountValue,
          description: transaction.description
        },
        amountDetails: {
          originalAmount: transaction.originalAmount,
          discountAmount: transaction.discountValue,
          finalAmount: transaction.finalAmountPaid
        }
      }
    };

    // Create the order document
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, orderData);

    // Create comprehensive loyalty transaction with FIXED points calculation
    const loyaltyTransactionData: Omit<ComprehensiveLoyaltyTransaction, 'id' | 'auditTrail'> & { createdBy: string } = {
      userId: userId,
      userName: userData.displayName || userData.userName || 'Guest',
      orderId: orderId,
      userDetails: {
        phoneNumber: userData.phoneNumber || '',
        email: userData.email || '',
        isFirstTimeUser: userData.isFirstTimeUser ?? true,
        totalOrdersBeforeThis: userData.totalOrders || 0,
        totalSpentBeforeThis: userData.totalSpent || 0 
      },
      orderDetails: {
        originalAmount: transaction.originalAmount,
        discountType: transaction.discountType as 'flat_percentage' | 'first_time' | 'points' | 'none',
        discountAmount: transaction.discountValue,
        finalAmount: transaction.finalAmountPaid,
        items: transaction.items || [],
        orderType: transaction.orderType || 'regular',
        tableNumber: transaction.tableNumber || undefined,
        baristaNotes: transaction.baristaNotes || undefined
      },
      loyaltyDetails: {
        pointsBeforeTransaction: pointsBeforeOrder, // FIXED: Correct before points
        pointsEarned: transaction.pointsEarned, // Earned on final amount
        pointsRedeemed: transaction.pointsUsed, // Used for discount
        pointsAfterTransaction: pointsAfterOrder, // FIXED: Correct after points
        earningRate: this.POINTS_EARNING_RATE
      },
      transactionDetails: {
        timestamp: Timestamp.fromDate(transaction.timestamp),
        paymentMode: 'loyalty',
        status: 'completed',
        staffId: auth.currentUser?.uid || 'system',
        notes: transaction.description
      },
      createdBy: auth.currentUser?.uid || 'system'
    };

    await this.loyaltyTransaction(loyaltyTransactionData);

    return orderData;
  } catch (error) {
    console.error('Error creating transaction record:', error);
    throw new Error('Failed to create transaction record');
  }
}

  // FIXED: Process redemption with proper first-time user validation
  async processRedemption(
  userId: string,
  orderAmount: number,
  discountType: 'flat_percentage' | 'points' | 'first_time',
  pointsToRedeem: number = 0,
  orderId?: string,
  items?: any[],
  orderType?: string,
  tableNumber?: string,
  baristaNotes?: string
): Promise<RedemptionResult> {
  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const currentPoints = userData?.loyaltyPoints || 0;
      const userName = userData?.displayName || userData?.userName || 'Guest';
      const isFirstTimeUser = userData.isFirstTimeUser ?? true;
      const totalOrders = userData.totalOrders || 0;
      const totalSpent = userData.totalSpent || 0;

      // Validate first-time user discount
      if (discountType === 'first_time' && !isFirstTimeUser) {
        return {
          userName,
          orderAmount,
          discountApplied: 0,
          pointsUsed: 0,
          remainingPoints: currentPoints,
          finalAmount: orderAmount,
          pointsEarned: 0,
          discountType: 'first_time',
          error: 'First-time discount is only available for new users',
          isFirstTimeUser: false
        };
      }

      // Validate points redemption
      if (discountType === 'points' && pointsToRedeem > currentPoints) {
        return {
          userName,
          orderAmount,
          discountApplied: 0,
          pointsUsed: 0,
          remainingPoints: currentPoints,
          finalAmount: orderAmount,
          pointsEarned: 0,
          discountType: 'points',
          error: 'Insufficient points for redemption'
        };
      }

      // Calculate discount and final amount
      let discountApplied = 0;
      let pointsUsed = 0;
      let finalAmount = orderAmount;

      if (discountType === 'first_time' && isFirstTimeUser) {
        discountApplied = Math.min(this.FIRST_TIME_DISCOUNT, orderAmount);
        finalAmount = orderAmount - discountApplied;
        pointsUsed = 0; // No points used for first-time discount
      } else if (discountType === 'points') {
        pointsUsed = Math.min(pointsToRedeem, currentPoints, orderAmount);
        discountApplied = pointsUsed;
        finalAmount = orderAmount - pointsUsed;
      } else if (discountType === 'flat_percentage' && orderAmount >= this.MIN_ORDER_AMOUNT) {
        discountApplied = (orderAmount * this.FLAT_DISCOUNT_PERCENTAGE) / 100;
        finalAmount = orderAmount - discountApplied;
        pointsUsed = 0; // No points used for flat percentage discount
      }

      // FIXED: Calculate points earned based on final amount (what customer pays)
      const pointsEarned = Math.round(finalAmount * this.POINTS_EARNING_RATE);
      
      // FIXED: Calculate new balance correctly
      const newBalance = currentPoints + pointsEarned - pointsUsed;

      // Update user data
      const updateData = {
        loyaltyPoints: newBalance,
        totalOrders: totalOrders + 1,
        totalSpent: totalSpent + finalAmount,
        isFirstTimeUser: false,
        updatedAt: Timestamp.now()
      };

      transaction.update(userRef, updateData);

      // Create comprehensive transaction record if orderId is provided
      if (orderId) {
        const loyaltyTransactionData: Omit<ComprehensiveLoyaltyTransaction, 'id' | 'auditTrail'> & { createdBy: string } = {
          userId: userId,
          userName: userName,
          orderId: orderId,
          userDetails: {
            phoneNumber: userData.phoneNumber || '',
            email: userData.email || '',
            isFirstTimeUser: isFirstTimeUser,
            totalOrdersBeforeThis: totalOrders,
            totalSpentBeforeThis: totalSpent
          },
          orderDetails: {
            originalAmount: orderAmount,
            discountType: discountType,
            discountAmount: discountApplied,
            finalAmount: finalAmount,
            items: items || [],
            orderType: orderType || 'regular',
            tableNumber: tableNumber || undefined,
            baristaNotes: baristaNotes || undefined
          },
          loyaltyDetails: {
            pointsBeforeTransaction: currentPoints, // FIXED: Current points before transaction
            pointsEarned: pointsEarned, // Earned on final amount
            pointsRedeemed: pointsUsed, // Used for discount (0 for flat_percentage)
            pointsAfterTransaction: newBalance, // FIXED: Correct calculation
            earningRate: this.POINTS_EARNING_RATE
          },
          transactionDetails: {
            timestamp: Timestamp.now(),
            paymentMode: 'loyalty',
            status: 'completed',
            staffId: auth.currentUser?.uid || 'system',
            notes: `Order processed with ${discountType} discount`
          },
          createdBy: auth.currentUser?.uid || 'system'
        };

        // Store comprehensive transaction after the main transaction completes
        setTimeout(async () => {
          try {
            await this.loyaltyTransaction(loyaltyTransactionData);
          } catch (error) {
            console.error('Error creating comprehensive transaction:', error);
          }
        }, 100);
      }

      return {
        userName,
        orderAmount,
        discountApplied,
        pointsUsed,
        remainingPoints: newBalance,
        finalAmount,
        pointsEarned,
        discountType,
        isFirstTimeUser: false
      };
    });
  } catch (error) {
    console.error('Error processing redemption:', error);
    throw new Error('Failed to process redemption');
  }
}

  // Update user points (for admin adjustments)
  async updateUserPoints(userId: string, pointsAdjustment: number, reason: string): Promise<void> {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentPoints = userData?.loyaltyPoints || 0;
        const newBalance = Math.max(0, currentPoints + pointsAdjustment);

        transaction.update(userRef, {
          loyaltyPoints: newBalance,
          updatedAt: Timestamp.now()
        });

        // Create points transaction record
        const pointsTransactionRef = collection(db, 'pointsTransactions');
        const pointsTransaction: PointsTransaction = {
          userId,
          points: pointsAdjustment,
          type: pointsAdjustment > 0 ? 'bonus' : 'adjusted',
          description: reason,
          timestamp: Timestamp.now(),
          createdBy: auth.currentUser?.uid || 'admin'
        };

        transaction.set(doc(pointsTransactionRef), pointsTransaction);
      });
    } catch (error) {
      console.error('Error updating user points:', error);
      throw new Error('Failed to update user points');
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Get transaction history for detailed stats
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, where('userId', '==', userId));
      const transactionDocs = await getDocs(q);

      let totalSaved = 0;
      let totalPointsEarned = 0;
      let totalPointsRedeemed = 0;

      transactionDocs.forEach(doc => {
        const transaction = doc.data();
        totalSaved += transaction.discountValue || 0;
        totalPointsEarned += transaction.pointsEarned || 0;
        totalPointsRedeemed += transaction.pointsUsed || 0;
      });

      return {
        totalOrders: userData?.totalOrders || 0,
        totalSpent: userData?.totalSpent || 0,
        totalSaved,
        totalPointsEarned,
        totalPointsRedeemed,
        currentPoints: userData.loyaltyPoints || 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  // FIXED: Get user's first-time status with proper validation
  async getUserFirstTimeStatus(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return true; // New user is considered first-time
      }
      
      const userData = userDoc.data();
      return userData.isFirstTimeUser ?? true;
    } catch (error) {
      console.error('Error checking first-time status:', error);
      return true; // Default to first-time on error
    }
  }

  // FIXED: Set user's first-time status (used after successful order)
  async setUserFirstTimeStatus(userId: string, isFirstTime: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isFirstTimeUser: isFirstTime,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating first-time status:', error);
      throw new Error('Failed to update first-time status');
    }
  }

  // Bulk update user points (for admin operations)
  async bulkUpdateUserPoints(updates: Array<{userId: string, pointsAdjustment: number, reason: string}>): Promise<void> {
    try {
      const batch = writeBatch(db);
      const timestamp = Timestamp.now();

      for (const update of updates) {
        const userRef = doc(db, 'users', update.userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentPoints = userData.loyaltyPoints || 0;
          const newBalance = Math.max(0, currentPoints + update.pointsAdjustment);
          
          batch.update(userRef, {
            loyaltyPoints: newBalance,
            updatedAt: timestamp
          });

          // Create points transaction record
          const pointsTransactionRef = doc(collection(db, 'pointsTransactions'));
          const pointsTransaction: PointsTransaction = {
            userId: update.userId,
            points: update.pointsAdjustment,
            type: update.pointsAdjustment > 0 ? 'bonus' : 'adjusted',
            description: update.reason,
            timestamp: timestamp,
            createdBy: auth.currentUser?.uid || 'admin'
          };

          batch.set(pointsTransactionRef, pointsTransaction);
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error in bulk points update:', error);
      throw new Error('Failed to update points in bulk');
    }
  }

  // Get loyalty configuration
  getLoyaltyConfig(): LoyaltyConfig {
    return LOYALTY_CONFIG;
  }

  // Check if user can use first-time discount
  async canUseFirstTimeDiscount(userId: string): Promise<boolean> {
    try {
      const isFirstTime = await this.getUserFirstTimeStatus(userId);
      return isFirstTime;
    } catch (error) {
      console.error('Error checking first-time discount eligibility:', error);
      return false;
    }
  }

  // Get comprehensive analytics for admin dashboard
  async getLoyaltyAnalytics(dateRange?: { start: Date, end: Date }): Promise<{
    totalUsers: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    totalDiscountsGiven: number;
    totalRevenue: number;
    firstTimeUsers: number;
    returningUsers: number;
  }> {
    try {
      let query = collection(db, 'loyaltyTransactions');
      
      if (dateRange) {
        query = collection(db, 'loyaltyTransactions');
        // Add date range filtering if needed
      }

      const snapshot = await getDocs(query);
      const transactions = snapshot.docs.map(doc => doc.data()) as ComprehensiveLoyaltyTransaction[];

      const analytics = transactions.reduce((acc, transaction) => {
        acc.totalPointsEarned += transaction.loyaltyDetails.pointsEarned;
        acc.totalPointsRedeemed += transaction.loyaltyDetails.pointsRedeemed;
        acc.totalDiscountsGiven += transaction.orderDetails.discountAmount;
        acc.totalRevenue += transaction.orderDetails.finalAmount;
        
        if (transaction.userDetails.isFirstTimeUser) {
          acc.firstTimeUsers += 1;
        } else {
          acc.returningUsers += 1;
        }
        
        return acc;
      }, {
        totalUsers: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        totalDiscountsGiven: 0,
        totalRevenue: 0,
        firstTimeUsers: 0,
        returningUsers: 0
      });

      // Get unique users count
      const uniqueUsers = new Set(transactions.map(t => t.userId)).size;
      analytics.totalUsers = uniqueUsers;

      return analytics;
    } catch (error) {
      console.error('Error fetching loyalty analytics:', error);
      throw new Error('Failed to fetch loyalty analytics');
    }
  }

  // Calculate maximum redeemable amount based on available points
  calculateMaxRedeemableAmount(availablePoints: number, orderAmount: number): number {
    // 1 point = 1 rupee discount
    const maxDiscount = Math.min(availablePoints, orderAmount);
    return Math.max(0, maxDiscount);
  }

  // Calculate points earned based on final amount
  calculatePointsEarned(finalAmount: number): number {
    return Math.floor(finalAmount * this.pointsEarningRate);
  }
}

// Export singleton instance
export const loyaltyService = new LoyaltyServiceClass();