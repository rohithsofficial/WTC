// src/services/DatabaseService.ts
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  runTransaction, 
  increment,
  getFirestore
} from '@react-native-firebase/firestore';
import { db } from "../firebase/firebase-config";
import { OrderData, PaymentResult } from '../types/interfaces';

interface PaymentRecord {
  id?: string;
  orderId: string;
  merchantTransactionId: string;
  phonePeTransactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentTimestamp: Timestamp;
  paymentDetails: any;
  refundDetails?: {
    refundId: string;
    refundAmount: number;
    refundReason: string;
    refundTimestamp: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface OrderRecord extends OrderData {
  id?: string;
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  estimatedDeliveryTime?: Timestamp;
  actualDeliveryTime?: Timestamp;
  paymentId?: string;
  updatedAt: Timestamp;
}

class DatabaseService {
  
  /**
   * Create a new order with transaction safety
   */
  static async createOrder(orderData: OrderData): Promise<string> {
    try {
      console.log('💾 Creating order in database:', orderData);

      const orderRecord: OrderRecord = {
        ...orderData,
        orderStatus: 'PENDING',
        paymentStatus: 'Processing',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderRecord);
      console.log('✅ Order created with ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record successful payment with transaction safety
   */
  static async recordSuccessfulPayment(
    orderId: string, 
    paymentDetails: {
      type: string;
      pointsRedeemed: number;
      pointsEarned: number;
    }
  ): Promise<void> {
    try {
      console.log('💳 Recording successful payment for order:', orderId);

      await runTransaction(db, async (transaction) => {
        // Get order reference
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('Order not found');
        }

        const orderData = orderDoc.data() as OrderRecord;

        // Update order with payment info
        transaction.update(orderRef, {
          paymentStatus: 'Completed',
          orderStatus: 'CONFIRMED',
          paymentTimestamp: Timestamp.now(),
          updatedAt: Timestamp.now(),
          paymentDetails: paymentDetails
        });

        // Update user's order count (for analytics)
        await this.updateUserStats(orderData.userId, orderData.totalAmount);

        console.log('✅ Payment recorded successfully');
      });

    } catch (error) {
      console.error('❌ Error recording payment:', error);
      throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update order status after failed payment
   */
  static async recordFailedPayment(orderId: string, error: string): Promise<void> {
    try {
      console.log('❌ Recording failed payment for order:', orderId);

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        paymentStatus: 'Failed',
        orderStatus: 'CANCELLED',
        paymentError: error,
        updatedAt: Timestamp.now(),
      });

      console.log('✅ Failed payment recorded');
    } catch (dbError) {
      console.error('❌ Error recording failed payment:', dbError);
      throw new Error(`Failed to record payment failure: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
  }

  /**
   * Update order status (for order tracking)
   */
  static async updateOrderStatus(
    orderId: string, 
    status: OrderRecord['orderStatus'],
    estimatedDeliveryTime?: Date
  ): Promise<void> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const updateData: any = {
        orderStatus: status,
        updatedAt: Timestamp.now(),
      };

      if (estimatedDeliveryTime) {
        updateData.estimatedDeliveryTime = Timestamp.fromDate(estimatedDeliveryTime);
      }

      if (status === 'DELIVERED') {
        updateData.actualDeliveryTime = Timestamp.now();
      }

      await updateDoc(orderRef, updateData);
      console.log(`✅ Order ${orderId} status updated to ${status}`);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order details with payment info
   */
  static async getOrderDetails(orderId: string): Promise<OrderRecord | null> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return { id: orderDoc.id, ...orderDoc.data() } as OrderRecord;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(paymentId: string): Promise<PaymentRecord | null> {
    try {
      const paymentRef = doc(db, "payments", paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        return null;
      }

      return { id: paymentDoc.id, ...paymentDoc.data() } as PaymentRecord;
    } catch (error) {
      console.error('Error getting payment details:', error);
      throw error;
    }
  }

  /**
   * Get user's order history
   */
  static async getUserOrderHistory(userId: string, limit: number = 10): Promise<OrderRecord[]> {
    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(ordersQuery);
      const orders: OrderRecord[] = [];

      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as OrderRecord);
      });

      return orders;
    } catch (error) {
      console.error('Error getting user order history:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  static async processRefund(
    orderId: string,
    refundAmount: number,
    refundReason: string,
    refundTransactionId: string
  ): Promise<void> {
    try {
      console.log('🔄 Processing refund for order:', orderId);

      await runTransaction(db, async (transaction) => {
        // Get order
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('Order not found');
        }

        const orderData = orderDoc.data() as OrderRecord;

        // Find payment record
        const paymentsQuery = query(
          collection(db, "payments"),
          where("orderId", "==", orderId)
        );
        const paymentSnapshot = await getDocs(paymentsQuery);

        if (paymentSnapshot.empty) {
          throw new Error('Payment record not found');
        }

        const paymentDoc = paymentSnapshot.docs[0];
        const paymentRef = doc(db, "payments", paymentDoc.id);

        // Update payment record with refund
        transaction.update(paymentRef, {
          paymentStatus: 'REFUNDED',
          refundDetails: {
            refundId: refundTransactionId,
            refundAmount,
            refundReason,
            refundTimestamp: Timestamp.now(),
          },
          updatedAt: Timestamp.now(),
        });

        // Update order status
        transaction.update(orderRef, {
          orderStatus: 'CANCELLED',
          paymentStatus: 'Refunded',
          refundAmount,
          refundReason,
          refundTimestamp: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log('✅ Refund processed successfully');
      });

    } catch (error) {
      console.error('❌ Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Update user statistics
   */
  private static async updateUserStats(userId: string, orderAmount: number): Promise<void> {
    try {
      const userStatsRef = doc(db, "userStats", userId);
      const userStatsDoc = await getDoc(userStatsRef);

      if (userStatsDoc.exists()) {
        await updateDoc(userStatsRef, {
          totalOrders: increment(1),
          totalSpent: increment(orderAmount),
          lastOrderDate: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, "userStats"), {
          userId,
          totalOrders: 1,
          totalSpent: orderAmount,
          lastOrderDate: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get daily sales report
   */
  static async getDailySalesReport(date: Date): Promise<{
    totalOrders: number;
    totalRevenue: number;
    successfulPayments: number;
    failedPayments: number;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const ordersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
        where("createdAt", "<=", Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(ordersQuery);
      let totalOrders = 0;
      let totalRevenue = 0;
      let successfulPayments = 0;
      let failedPayments = 0;

      querySnapshot.forEach((doc) => {
        const order = doc.data() as OrderRecord;
        totalOrders++;
        
        if (order.paymentStatus === 'Completed') {
          totalRevenue += order.totalAmount;
          successfulPayments++;
        } else if (order.paymentStatus === 'Failed') {
          failedPayments++;
        }
      });

      return {
        totalOrders,
        totalRevenue,
        successfulPayments,
        failedPayments
      };
    } catch (error) {
      console.error('Error getting daily sales report:', error);
      throw error;
    }
  }
}

export default DatabaseService;