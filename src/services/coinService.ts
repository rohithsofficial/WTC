import { db } from '../firebase/config';
import { Timestamp, doc, getDoc, updateDoc, collection, addDoc, writeBatch } from 'firebase/firestore';

interface OrderData {
  userId: string;
  amount: number;
  coinsUsed: number;
  coinsEarned: number;
  type: 'online' | 'offline';
  timestamp: Timestamp;
}

/**
 * Get user's current coin balance
 */
export const getUserCoins = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.coins || 0;
  } catch (error) {
    console.error('Error getting user coins:', error);
    throw error;
  }
};

/**
 * Earn coins after a purchase
 */
export const earnCoins = async (
  userId: string,
  amount: number,
  coinsUsed: number = 0,
  type: 'online' | 'offline' = 'online'
): Promise<void> => {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);
  const orderRef = doc(collection(db, 'orders'));

  try {
    // Calculate coins earned (10% of purchase amount)
    const coinsEarned = Math.floor(amount * 0.1);

    // Get current user data
    const userDoc = await getDoc(userRef);
    const currentCoins = userDoc.data()?.coins || 0;

    // Calculate new coin balance
    const newCoinBalance = currentCoins - coinsUsed + coinsEarned;

    // Create order data
    const orderData: OrderData = {
      userId,
      amount,
      coinsUsed,
      coinsEarned,
      type,
      timestamp: Timestamp.now(),
    };

    // Update user's coin balance
    batch.update(userRef, { coins: newCoinBalance });

    // Create new order
    batch.set(orderRef, orderData);

    // Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error earning coins:', error);
    throw error;
  }
};

/**
 * Redeem coins for a purchase
 */
export const redeemCoins = async (
  userId: string,
  amount: number,
  coinsToUse: number
): Promise<void> => {
  try {
    // Validate coin usage
    if (coinsToUse > amount) {
      throw new Error('Cannot use more coins than the purchase amount');
    }

    const currentCoins = await getUserCoins(userId);
    if (coinsToUse > currentCoins) {
      throw new Error('Not enough coins available');
    }

    // Process the purchase with coin redemption
    await earnCoins(userId, amount, coinsToUse);
  } catch (error) {
    console.error('Error redeeming coins:', error);
    throw error;
  }
}; 