import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LoyaltyPointsDisplay from '../components/LoyaltyPointsDisplay';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { LOYALTY_CONFIG } from '../types/loyalty';

const LoyaltyScreen = () => {
  const [loyaltyData, setLoyaltyData] = useState({ points: 0 });

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setLoyaltyData({
          points: data.loyaltyPoints ?? 0
        });
      }
    };

    fetchLoyaltyData();
  }, []);

  const calculateNextReward = (currentPoints: number) => {
    const { minRedemption, redemptionRate } = LOYALTY_CONFIG;
    
    // If user has less than minimum redemption points
    if (currentPoints < minRedemption) {
      return {
        pointsNeeded: minRedemption - currentPoints,
        rewardValue: Math.floor(minRedemption * redemptionRate)
      };
    }
    
    // Calculate next reward increment
    const rewardIncrement = Math.ceil(minRedemption);
    const rewardValue = Math.floor(rewardIncrement * redemptionRate);
    
    // Find next milestone
    const currentRewardLevel = Math.floor(currentPoints / rewardIncrement);
    const nextRewardLevel = currentRewardLevel + 1;
    const nextMilestonePoints = nextRewardLevel * rewardIncrement;
    
    return {
      pointsNeeded: nextMilestonePoints - currentPoints,
      rewardValue: Math.floor(nextMilestonePoints * redemptionRate)
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.pointsContainer}>
        <LoyaltyPointsDisplay 
          points={loyaltyData.points} 
          nextMilestone={calculateNextReward(loyaltyData.points)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pointsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoyaltyScreen; 