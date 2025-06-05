// src/components/RedeemPointsInput.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../theme/theme';
import { LoyaltyService } from '../services/loyaltyService';
import type { RedemptionCalculation } from '../types/loyalty';

interface RedeemPointsInputProps {
  availablePoints: number;
  orderAmount: number;
  onRedemptionChange: (calculation: RedemptionCalculation) => void;
  disabled?: boolean;
}

const RedeemPointsInput: React.FC<RedeemPointsInputProps> = ({
  availablePoints,
  orderAmount,
  onRedemptionChange,
  disabled = false
}) => {
  const [pointsInput, setPointsInput] = useState('');
  const [calculation, setCalculation] = useState<RedemptionCalculation>({
    pointsToRedeem: 0,
    discountAmount: 0,
    remainingAmount: orderAmount,
    isValid: true
  });

  useEffect(() => {
    const points = parseInt(pointsInput) || 0;
    const newCalculation = LoyaltyService.calculateRedemption(
      points, 
      availablePoints, 
      orderAmount
    );
    setCalculation(newCalculation);
    onRedemptionChange(newCalculation);
  }, [pointsInput, availablePoints, orderAmount]);

  const handleMaxRedeem = () => {
    const maxCalculation = LoyaltyService.calculateRedemption(
      availablePoints, 
      availablePoints, 
      orderAmount
    );
    setPointsInput(maxCalculation.pointsToRedeem.toString());
  };

  const canRedeem = availablePoints >= 50;

  if (!canRedeem) {
    return (
      <View style={styles.container}>
        <Text style={styles.disabledText}>
          Minimum 50 points required for redemption
        </Text>
        <Text style={styles.disabledSubtext}>
          You have {availablePoints} points
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Redeem Points</Text>
        <TouchableOpacity onPress={handleMaxRedeem} style={styles.maxButton}>
          <Text style={styles.maxButtonText}>Use Max</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          placeholder="Enter points to redeem"
          placeholderTextColor={COLORS.primaryLightGreyHex}
          value={pointsInput}
          onChangeText={setPointsInput}
          keyboardType="numeric"
          editable={!disabled}
          maxLength={6}
        />
        <Text style={styles.availableText}>Available: {availablePoints}</Text>
      </View>

      {calculation.discountAmount > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Points to redeem:</Text>
            <Text style={styles.summaryValue}>{calculation.pointsToRedeem}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount:</Text>
            <Text style={styles.discountValue}>-₹{calculation.discountAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>New Total:</Text>
            <Text style={styles.totalValue}>₹{calculation.remainingAmount.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {calculation.errorMessage && (
        <Text style={styles.errorText}>{calculation.errorMessage}</Text>
      )}
    </View>
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

  // RedeemPointsInput styles - reusing container
  title: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  maxButton: {
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_16,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_8,
  },
  maxButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  inputContainer: {
    marginVertical: SPACING.space_15,
  },
  input: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
  },
  disabledInput: {
    opacity: 0.5,
  },
  availableText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
    textAlign: 'right',
  },
  summaryContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
    marginTop: SPACING.space_10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.space_8,
  },
  summaryLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  summaryValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  discountValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreenHex,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryGreyHex,
    paddingTop: SPACING.space_8,
    marginBottom: 0,
  },
  totalLabel: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  totalValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryRedHex,
    marginTop: SPACING.space_8,
    textAlign: 'center',
  },
  disabledText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    padding: SPACING.space_20,
  },
  disabledSubtext: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_4,
  },
});

export { RedeemPointsInput };