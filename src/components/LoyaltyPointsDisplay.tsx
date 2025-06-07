// src/components/LoyaltyPointsDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LOYALTY_CONFIG } from '../types/loyalty';
import { LoyaltyService } from '../services/loyaltyService';
import { COLORS } from '../theme/theme';

interface LoyaltyPointsDisplayProps {
  availablePoints: number;
  nextMilestone: {
    pointsNeeded: number;
    rewardValue: number;
  };
}

const LoyaltyPointsDisplay: React.FC<LoyaltyPointsDisplayProps> = ({
  availablePoints,
  nextMilestone,
}) => {
  // Get current tier based on points
  const currentTier = LOYALTY_CONFIG.tiers.find(tier => 
    availablePoints >= tier.minPoints && 
    (tier.maxPoints ? availablePoints < tier.maxPoints : true)
  ) || LOYALTY_CONFIG.tiers[0];

  // Get next tier
  const nextTier = LOYALTY_CONFIG.tiers.find(tier => tier.minPoints > availablePoints);

  // Calculate progress percentage between current tier and next tier, capped at 100%
  const progressPercentage = nextTier
    ? Math.min(
        ((availablePoints - currentTier.minPoints) /
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
        <Text style={styles.pointsValue}>{availablePoints}</Text>
        <Text style={styles.pointsLabel}>Available Points</Text>
      </View>

      <View style={styles.progressContainer}>
        {nextTier ? (
          <>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%`, backgroundColor: currentTier.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercentage.toFixed(0)}% to {nextTier.name}
            </Text>
          </>
        ) : (
          <Text style={styles.progressText}>You're in the final tier 🎉</Text>
        )}
      </View>

      <View style={styles.milestoneContainer}>
        <Text style={styles.milestoneTitle}>Next Reward</Text>
        <Text style={styles.milestoneText}>
          {nextMilestone.pointsNeeded} points needed for ₹{nextMilestone.rewardValue} off
        </Text>
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
