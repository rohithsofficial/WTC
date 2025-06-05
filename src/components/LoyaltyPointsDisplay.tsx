// src/components/LoyaltyPointsDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../theme/theme';
import CustomIcon from './CustomIcon';

interface LoyaltyPointsDisplayProps {
  availablePoints: number;
  pointsToNextReward: number;
  nextRewardValue: number;
  onPress?: () => void;
}

const LoyaltyPointsDisplay: React.FC<LoyaltyPointsDisplayProps> = ({
  availablePoints,
  pointsToNextReward,
  nextRewardValue,
  onPress
}) => {
  const progressPercentage = Math.min(
    ((availablePoints % 500) / 500) * 100, 
    100
  );

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[COLORS.primaryOrangeHex, '#FF8C42']}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <View style={styles.header}>
          <View style={styles.pointsSection}>
            <Text style={styles.pointsLabel}>Loyalty Points</Text>
            <View style={styles.pointsRow}>
              <CustomIcon 
                name="star" 
                size={FONTSIZE.size_20} 
                color={COLORS.primaryWhiteHex} 
              />
              <Text style={styles.pointsValue}>{availablePoints}</Text>
            </View>
          </View>
          
          <View style={styles.valueSection}>
            <Text style={styles.valueLabel}>Worth</Text>
            <Text style={styles.valueAmount}>₹{(availablePoints * 0.1).toFixed(0)}</Text>
          </View>
        </View>

        {pointsToNextReward > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {pointsToNextReward} points to ₹{nextRewardValue} reward
              </Text>
              <Text style={styles.progressPercentage}>{progressPercentage.toFixed(0)}%</Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // LoyaltyPointsDisplay styles
  container: {
    marginVertical: SPACING.space_10,
  },
  gradientContainer: {
    padding: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_15,
  },
  pointsSection: {
    flex: 1,
  },
  pointsLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    opacity: 0.8,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.space_4,
  },
  pointsValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
  },
  valueSection: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    opacity: 0.8,
  },
  valueAmount: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_4,
  },
  progressSection: {
    marginTop: SPACING.space_10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  progressText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    opacity: 0.9,
  },
  progressPercentage: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 3,
  },
});

export { LoyaltyPointsDisplay};