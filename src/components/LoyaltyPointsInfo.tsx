import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../theme/theme';
import { format } from 'date-fns';

interface LoyaltyPointsInfoProps {
  points: number;
  originalPoints: number;
  earnedAt: Date;
  multiplier: number;
  orderId: string;
  status: 'active' | 'used';
  description: string;
}

const LoyaltyPointsInfo: React.FC<LoyaltyPointsInfoProps> = ({
  points,
  originalPoints,
  earnedAt,
  multiplier,
  orderId,
  status,
  description,
}) => {
  // Format date
  const formattedEarnedDate = format(earnedAt, 'dd MMM yyyy, hh:mm a');

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return COLORS.primaryGreenHex;
      case 'used':
        return COLORS.primaryOrangeHex;
      default:
        return COLORS.primaryGreyHex;
    }
  };

  return (
    <View style={styles.container}>
      {/* Points Summary */}
      <View style={styles.pointsSummary}>
        <Text style={styles.pointsValue}>{points.toLocaleString()} points</Text>
        {multiplier > 1 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{multiplier}x</Text>
          </View>
        )}
      </View>

      {/* Points Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, { color: getStatusColor() }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Earned:</Text>
          <Text style={styles.detailValue}>{formattedEarnedDate}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order ID:</Text>
          <Text style={styles.detailValue}>{orderId}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue}>{description}</Text>
        </View>

        {multiplier > 1 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Original Points:</Text>
            <Text style={styles.detailValue}>{originalPoints.toLocaleString()}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_15,
    marginVertical: SPACING.space_10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_15,
  },
  pointsValue: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
  },
  multiplierBadge: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_10,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
    marginLeft: SPACING.space_10,
  },
  multiplierText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  detailsContainer: {
    gap: SPACING.space_8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  detailValue: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.space_10,
  },
});

export default LoyaltyPointsInfo; 