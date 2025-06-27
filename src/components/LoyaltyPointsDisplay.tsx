// src/components/LoyaltyPointsDisplay.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { LOYALTY_CONFIG } from '../types/loyalty';
import { COLORS } from '../theme/theme';
import { db, auth } from "../firebase/firebase-config";

interface LoyaltyPointsDisplayProps {
  initialPoints?: number;
  onPointsUpdate?: (points: number) => void;
}

interface NextReward {
  pointsNeeded: number;
  rewardValue: number;
}

const LoyaltyPointsDisplay: React.FC<LoyaltyPointsDisplayProps> = ({ 
  initialPoints: propPoints,
  onPointsUpdate 
}) => {
  const [availablePoints, setAvailablePoints] = useState<number>(propPoints || 0);
  const [loading, setLoading] = useState<boolean>(!propPoints);

  useEffect(() => {
    if (propPoints !== undefined) {
      setAvailablePoints(propPoints);
      return;
    }

    const fetchLoyaltyData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setLoading(false);
          return;
        }
        const docRef = db.collection('users').doc(userId);
        let docSnap;
        try {
          docSnap = await docRef.get();
        } catch (err) {
          Alert.alert('Connection Error', 'Unable to fetch your loyalty data. Please try again.');
          setLoading(false);
          return;
        }
        if (docSnap.exists()) {
          const data = docSnap.data();
          const points = data?.loyaltyPoints ?? 0;
          setAvailablePoints(points);
          onPointsUpdate?.(points);
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error);
        Alert.alert('Error', 'Unable to load your loyalty points. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLoyaltyData();
  }, [propPoints, onPointsUpdate]);

  // Calculate next reward milestone
  const calculateNextReward = (): NextReward => {
    const { minRedemption, redemptionRate } = LOYALTY_CONFIG;
    
    // If user has less than minimum redemption points
    if (availablePoints < minRedemption) {
      return {
        pointsNeeded: minRedemption - availablePoints,
        rewardValue: Math.floor(minRedemption * redemptionRate)
      };
    }
    
    // Calculate next reward increment (every 10 points = ₹10)
    const rewardIncrement = 10; // Every 10 points
    const currentRewardLevel = Math.floor(availablePoints / rewardIncrement);
    const nextRewardLevel = currentRewardLevel + 1;
    const nextMilestonePoints = nextRewardLevel * rewardIncrement;
    
    return {
      pointsNeeded: nextMilestonePoints - availablePoints,
      rewardValue: Math.floor(nextMilestonePoints * redemptionRate)
    };
  };

  const nextReward = calculateNextReward();
  const currentRedeemableValue = Math.floor(availablePoints * LOYALTY_CONFIG.redemptionRate);
  const canRedeem = availablePoints >= LOYALTY_CONFIG.minRedemption;

  // Calculate earning rate display
  const earningRateText = `Earn ${LOYALTY_CONFIG.pointsPerRupee} points per ₹1 spent`;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading loyalty points...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loyalty Points</Text>
        <View style={styles.earningRate}>
          <Text style={styles.earningRateText}>{earningRateText}</Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{Math.max(0, availablePoints).toLocaleString()}</Text>
        <Text style={styles.pointsLabel}>Available Points</Text>
        {canRedeem && (
          <Text style={styles.redeemableValue}>
            Worth ₹{currentRedeemableValue}
          </Text>
        )}
      </View>



      {canRedeem && (
        <View style={styles.currentRewardContainer}>
          <Text style={styles.currentRewardTitle}>Ready to Redeem</Text>
          <Text style={styles.currentRewardText}>
            You have ₹{currentRedeemableValue} worth of points ready to use on your next order!
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How It Works:</Text>
        <Text style={styles.infoText}>• Spend ₹{Math.ceil(1/LOYALTY_CONFIG.pointsPerRupee)} = Earn 1 point</Text>
        <Text style={styles.infoText}>• 1 point = ₹{LOYALTY_CONFIG.redemptionRate} discount</Text>
        <Text style={styles.infoText}>• Minimum order: ₹{LOYALTY_CONFIG.minOrderAmount}</Text>
        <Text style={styles.infoText}>• Minimum redemption: {LOYALTY_CONFIG.minRedemption} point</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.primaryGreyHex,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
  },
  earningRate: {
    backgroundColor: COLORS.primaryRedHex,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningRateText: {
    fontSize: 12,
    color: COLORS.primaryWhiteHex,
    fontWeight: '500',
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primaryBlackHex,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
    marginTop: 4,
  },
  redeemableValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryOrangeHex || '#FF6B35',
    marginTop: 4,
  },
  rewardContainer: {
    backgroundColor: COLORS.primaryLightGreyHex,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 4,
  },
  rewardText: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.primaryGreyHex,
    marginTop: 4,
    textAlign: 'center',
  },
  currentRewardContainer: {
    backgroundColor: (COLORS.primaryOrangeHex || '#FF6B35') + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryOrangeHex || '#FF6B35',
  },
  currentRewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 4,
  },
  currentRewardText: {
    fontSize: 14,
    color: COLORS.primaryBlackHex,
    fontWeight: '500',
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    paddingTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
    marginBottom: 4,
  },
});

export default LoyaltyPointsDisplay;