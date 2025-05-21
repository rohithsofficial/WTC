import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LoyaltyReward, User } from '../types/interfaces';

interface LoyaltyState {
  points: number;
  availableRewards: LoyaltyReward[];
  loading: boolean;
  error: string | null;
}

export const useLoyalty = (userId: string) => {
  const [state, setState] = useState<LoyaltyState>({
    points: 0,
    availableRewards: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (userId) {
      loadLoyaltyData();
    }
  }, [userId]);

  const loadLoyaltyData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user's loyalty points
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data() as User;

      // Get available rewards
      const rewardsQuery = query(
        collection(db, 'loyalty_rewards'),
        where('active', '==', true)
      );
      const rewardsSnapshot = await getDocs(rewardsQuery);
      const rewards = rewardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoyaltyReward[];

      setState({
        points: userData.loyaltyPoints,
        availableRewards: rewards,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
    }
  };

  const addPoints = async (points: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as User;

      const newPoints = userData.loyaltyPoints + points;
      await updateDoc(userRef, { loyaltyPoints: newPoints });

      setState(prev => ({
        ...prev,
        points: newPoints,
        loading: false,
      }));

      return newPoints;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const redeemReward = async (rewardId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get reward details
      const rewardDoc = await getDoc(doc(db, 'loyalty_rewards', rewardId));
      const reward = rewardDoc.data() as LoyaltyReward;

      // Check if user has enough points
      if (state.points < reward.pointsCost) {
        throw new Error('Insufficient points');
      }

      // Deduct points
      const userRef = doc(db, 'users', userId);
      const newPoints = state.points - reward.pointsCost;
      await updateDoc(userRef, { loyaltyPoints: newPoints });

      // Add to user's rewards
      await updateDoc(doc(db, 'users', userId), {
        [`rewards.${rewardId}`]: {
          redeemedAt: new Date(),
          expiresAt: new Date(Date.now() + reward.expiresIn * 24 * 60 * 60 * 1000),
          used: false,
        },
      });

      setState(prev => ({
        ...prev,
        points: newPoints,
        loading: false,
      }));

      return reward;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const calculatePointsForOrder = (orderTotal: number): number => {
    // Example: 1 point per $1 spent
    return Math.floor(orderTotal);
  };

  return {
    points: state.points,
    availableRewards: state.availableRewards,
    loading: state.loading,
    error: state.error,
    addPoints,
    redeemReward,
    calculatePointsForOrder,
    refresh: loadLoyaltyData,
  };
}; 