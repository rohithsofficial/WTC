// RedeemPointsInput.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, FONTSIZE } from '../theme/theme';
import { loyaltyService, RedemptionCalculation } from '../services/loyaltyService';

interface RedeemPointsInputProps {
  availablePoints: number;
  orderAmount: number;
  onRedemptionChange: (calculation: RedemptionCalculation) => void;
  disabled?: boolean;
}

export const RedeemPointsInput: React.FC<RedeemPointsInputProps> = ({
  availablePoints,
  orderAmount,
  onRedemptionChange,
  disabled = false,
}) => {
  const [pointsToRedeem, setPointsToRedeem] = useState<string>('');
  const [calculation, setCalculation] = useState<RedemptionCalculation>({
    pointsToRedeem: 0,
    discountAmount: 0,
    remainingAmount: orderAmount,
    isValid: false,
  });

  // Calculate redemption when points input changes
  useEffect(() => {
    const points = parseInt(pointsToRedeem) || 0;
    const redemption = loyaltyService.calculateRedemption(
      availablePoints,
      orderAmount,
      points
    );
    setCalculation(redemption);
    onRedemptionChange(redemption);
  }, [pointsToRedeem, availablePoints, orderAmount]);

  // Handle points input change
  const handlePointsChange = (value: string) => {
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setPointsToRedeem(value);
    }
  };

  // Quick select buttons
  const quickSelectPoints = (percentage: number) => {
    const maxPoints = Math.min(availablePoints, orderAmount);
    const points = Math.floor(maxPoints * percentage);
    setPointsToRedeem(points.toString());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem Points</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={pointsToRedeem}
          onChangeText={handlePointsChange}
          keyboardType="numeric"
          placeholder="Enter points to redeem"
          placeholderTextColor={COLORS.primaryLightGreyHex}
          editable={!disabled}
        />
        <Text style={styles.pointsLabel}>points</Text>
      </View>

      <View style={styles.quickSelectContainer}>
        <TouchableOpacity
          style={styles.quickSelectButton}
          onPress={() => quickSelectPoints(0.25)}
          disabled={disabled}
        >
          <Text style={styles.quickSelectText}>25%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickSelectButton}
          onPress={() => quickSelectPoints(0.5)}
          disabled={disabled}
        >
          <Text style={styles.quickSelectText}>50%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickSelectButton}
          onPress={() => quickSelectPoints(0.75)}
          disabled={disabled}
        >
          <Text style={styles.quickSelectText}>75%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickSelectButton}
          onPress={() => quickSelectPoints(1)}
          disabled={disabled}
        >
          <Text style={styles.quickSelectText}>100%</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available Points:</Text>
          <Text style={styles.summaryValue}>{availablePoints}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Points to Redeem:</Text>
          <Text style={styles.summaryValue}>{calculation.pointsToRedeem}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount Amount:</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            ₹{calculation.discountAmount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining Amount:</Text>
          <Text style={styles.summaryValue}>₹{calculation.remainingAmount}</Text>
        </View>
      </View>

      {!calculation.isValid && pointsToRedeem !== '' && (
        <Text style={styles.errorText}>
          {calculation.pointsToRedeem > availablePoints
            ? 'Not enough points available'
            : calculation.pointsToRedeem > orderAmount
            ? 'Cannot redeem more points than order amount'
            : 'Please enter a valid number of points'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: FONTSIZE.size_18,
    fontWeight: '600',
    color: COLORS.primaryWhiteHex,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
  },
  pointsLabel: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickSelectButton: {
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  quickSelectText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: 8,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
  },
  summaryValue: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '500',
  },
  discountValue: {
    color: COLORS.primaryOrangeHex,
  },
  errorText: {
    color: COLORS.primaryRedHex,
    fontSize: FONTSIZE.size_12,
    marginTop: 8,
  },
});