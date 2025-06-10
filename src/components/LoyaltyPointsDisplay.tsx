// src/components/LoyaltyPointsDisplay.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LOYALTY_CONFIG ,MembershipTier } from '../types/loyalty';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS } from '../theme/theme';
import { db ,auth } from "../firebase/config";

interface LoyaltyPointsDisplayProps {
  initialPoints: number;
  nextMilestone?: {
  pointsNeeded: number;
  rewardValue: number;
  initialPoints?: number;
  initialTier?: MembershipTier;
  };
}


const LoyaltyPointsDisplay: React.FC<LoyaltyPointsDisplayProps> = () => {
  // Get current tier based on points
  const [initialPoints, setAvailablePoints] = useState<number>(0);
const [membershipTier, setMembershipTier] = useState<MembershipTier>('Bronze');

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      const userId = auth.currentUser?.uid; // get logged-in user's id
      if (!userId) return;

      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvailablePoints(data.loyaltyPoints ?? 0);
        setMembershipTier(data.membershipTier ?? 'Bronze');
      }
    };

    fetchLoyaltyData();
  }, []);

  const currentTier =
    LOYALTY_CONFIG.tiers
      .filter((tier) => initialPoints >= tier.minPoints)
      .sort((a, b) => b.minPoints - a.minPoints)[0] || LOYALTY_CONFIG.tiers[0];
  // Get next tier
  const nextTier = LOYALTY_CONFIG.tiers.find(tier => tier.minPoints > initialPoints);

  // Calculate next reward milestone
  const calculateNextReward = () => {
    const { minRedemption, redemptionRate } = LOYALTY_CONFIG;
    
    // If user has less than minimum redemption points
    if (initialPoints < minRedemption) {
      return {
        pointsNeeded: minRedemption - initialPoints,
        rewardValue: Math.floor(minRedemption * redemptionRate)
      };
    }
    
    // Calculate next reward increment (e.g., every 100 points = ₹10)
    const rewardIncrement = Math.ceil(minRedemption); // 100 points
    const rewardValue = Math.floor(rewardIncrement * redemptionRate); // ₹10
    
    // Find next milestone
    const currentRewardLevel = Math.floor(initialPoints / rewardIncrement);
    const nextRewardLevel = currentRewardLevel + 1;
    const nextMilestonePoints = nextRewardLevel * rewardIncrement;
    
    return {
      pointsNeeded: nextMilestonePoints - initialPoints,
      rewardValue: Math.floor(nextMilestonePoints * redemptionRate)
    };
  };

  const nextMilestone = calculateNextReward();

  // Calculate progress percentage between current tier and next tier, capped at 100%
  const progressPercentage = nextTier
    ? Math.min(
        ((initialPoints - currentTier.minPoints) /
          (nextTier.minPoints - currentTier.minPoints)) *
          100,
        100
      )
    : 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loyalty Points</Text>
        <View style={[styles.tierBadge, { backgroundColor: currentTier.color }]}>
          <Text style={styles.tierText}>{currentTier.name}</Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{Math.max(0, initialPoints).toLocaleString()}</Text>
        <Text style={styles.pointsLabel}>Available Points</Text>
      </View>

      <View style={styles.progressContainer}>
        {nextTier ? (
          <>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, progressPercentage))}%`, backgroundColor: currentTier.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.min(100, Math.max(0, progressPercentage)).toFixed(0)}% to {nextTier.name}
            </Text>
          </>
        ) : (
          <Text style={styles.progressText}>You're in the final tier 🎉</Text>
        )}
      </View>

      <View style={styles.milestoneContainer}>
        <Text style={styles.milestoneTitle}>Next Reward</Text>
        <Text style={styles.milestoneText}>
          {nextMilestone.pointsNeeded} points needed for ₹{nextMilestone.rewardValue} reward
        </Text>
        {initialPoints >= LOYALTY_CONFIG.minRedemption && (
          <Text style={styles.currentRewardText}>
            Current: ₹{Math.floor(initialPoints * LOYALTY_CONFIG.redemptionRate)} available to redeem
          </Text>
        )}
      </View>

      <View style={styles.tierBenefits}>
        <Text style={styles.benefitsTitle}>Current Tier Benefits:</Text>
        <Text style={styles.benefitText}>• {currentTier.pointMultiplier}x points on all purchases</Text>
        {currentTier.benefits.map((benefit: string, index: number) => (
          <Text key={index} style={styles.benefitText}>
            • {benefit}
          </Text>
        ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tierText: {
    color: COLORS.primaryWhiteHex,
    fontWeight: '600',
    fontSize: 14,
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
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.primaryLightGreyHex,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.primaryGreyHex,
    marginTop: 4,
    textAlign: 'center',
  },
  milestoneContainer: {
    backgroundColor: COLORS.primaryLightGreyHex,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 4,
  },
  milestoneText: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
  },
  currentRewardText: {
    fontSize: 12,
    color: COLORS.primaryGreyHex,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tierBenefits: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    paddingTop: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
    marginBottom: 4,
  },
});

export default LoyaltyPointsDisplay;