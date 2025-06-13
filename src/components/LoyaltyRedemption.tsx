// src/components/LoyaltyRedemption.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { LOYALTY_CONFIG, RedemptionCalculation } from '../types/loyalty';
import { loyaltyService } from '../services/loyaltyService';
import { COLORS } from '../theme/theme';

interface LoyaltyRedemptionProps {
  userId: string;
  orderAmount: number;
  availablePoints: number;
  onRedemptionChange: (calculation: RedemptionCalculation) => void;
  disabled?: boolean;
  showExpiryWarning?: boolean;
}

const LoyaltyRedemption: React.FC<LoyaltyRedemptionProps> = ({
  userId,
  orderAmount,
  availablePoints,
  onRedemptionChange,
  disabled = false,
  showExpiryWarning = true,
}) => {
  const [pointsInput, setPointsInput] = useState('');
  const [redemptionCalc, setRedemptionCalc] = useState<RedemptionCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState<{
    points: number;
    days: number;
  } | null>(null);

  // Calculate maximum redeemable points for this order
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(orderAmount * LOYALTY_CONFIG.maxRedemptionPercentage / LOYALTY_CONFIG.redemptionRate),
    Math.floor(LOYALTY_CONFIG.maxRedemptionAmount / LOYALTY_CONFIG.redemptionRate)
  );

  // Check for points near expiry
  useEffect(() => {
    if (showExpiryWarning) {
      checkExpiryWarning();
    }
  }, [userId, showExpiryWarning]);

  const checkExpiryWarning = async () => {
    try {
      const nearExpiry = await LoyaltyService.getPointsNearExpiry(userId);
      if (nearExpiry.totalPoints > 0) {
        setExpiryWarning({
          points: nearExpiry.totalPoints,
          days: nearExpiry.daysUntilExpiry,
        });
      }
    } catch (error) {
      console.error('Error checking expiry warning:', error);
    }
  };

  const calculateRedemption = (points: number) => {
    const calculation = LoyaltyService.calculateRedemption(
      points,
      availablePoints,
      orderAmount
    );
    setRedemptionCalc(calculation);
    onRedemptionChange(calculation);
  };

  const handlePointsChange = (value: string) => {
    setPointsInput(value);
    const points = parseInt(value) || 0;
    calculateRedemption(points);
  };

  const useMaxPoints = () => {
    const maxPoints = maxRedeemablePoints.toString();
    setPointsInput(maxPoints);
    calculateRedemption(maxRedeemablePoints);
  };

  const useExpiringPoints = () => {
    if (expiryWarning && expiryWarning.points > 0) {
      const pointsToUse = Math.min(expiryWarning.points, maxRedeemablePoints);
      const pointsStr = pointsToUse.toString();
      setPointsInput(pointsStr);
      calculateRedemption(pointsToUse);
    }
  };

  const clearRedemption = () => {
    setPointsInput('');
    setRedemptionCalc(null);
    onRedemptionChange({
      pointsToRedeem: 0,
      discountAmount: 0,
      remainingAmount: orderAmount,
      isValid: true,
    });
  };

  const renderExpiryWarning = () => {
    if (!expiryWarning || expiryWarning.points === 0) return null;

    const urgentExpiry = expiryWarning.days <= 7;
    const warningColor = urgentExpiry ? '#FF6B6B' : '#FFA500';

    return (
      <View style={[styles.expiryBanner, { backgroundColor: urgentExpiry ? '#FFEBEE' : '#FFF8E1' }]}>
        <Text style={[styles.expiryText, { color: warningColor }]}>
          ⚠️ {expiryWarning.points} points expiring in {expiryWarning.days} days
        </Text>
        <TouchableOpacity
          style={[styles.useExpiringButton, { backgroundColor: warningColor }]}
          onPress={useExpiringPoints}
        >
          <Text style={styles.useExpiringButtonText}>Use Expiring Points</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (availablePoints === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loyalty Points Redemption</Text>
        <View style={styles.noPointsContainer}>
          <Text style={styles.noPointsText}>
            You don't have any loyalty points yet.
          </Text>
          <Text style={styles.earnPointsText}>
            Complete orders to earn points!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem Loyalty Points</Text>
      
      {renderExpiryWarning()}

      <View style={styles.availablePointsContainer}>
        <Text style={styles.availablePointsLabel}>Available Points:</Text>
        <Text style={styles.availablePointsValue}>{availablePoints}</Text>
        <Text style={styles.pointsWorth}>
          (Worth ₹{(availablePoints * LOYALTY_CONFIG.redemptionRate).toFixed(0)})
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.pointsInput, !redemptionCalc?.isValid && pointsInput ? styles.inputError : null]}
          placeholder="Enter points to redeem"
          value={pointsInput}
          onChangeText={handlePointsChange}
          keyboardType="numeric"
          editable={!disabled && !loading}
        />
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.quickButton, disabled && styles.buttonDisabled]}
            onPress={useMaxPoints}
            disabled={disabled || maxRedeemablePoints === 0}
          >
            <Text style={styles.quickButtonText}>
              Use Max ({maxRedeemablePoints})
            </Text>
          </TouchableOpacity>
          
          {pointsInput && (
            <TouchableOpacity
              style={[styles.clearButton, disabled && styles.buttonDisabled]}
              onPress={clearRedemption}
              disabled={disabled}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {redemptionCalc && pointsInput && (
        <View style={styles.calculationContainer}>
          {redemptionCalc.isValid ? (
            <View style={styles.validCalculation}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Points to Redeem:</Text>
                <Text style={styles.calculationValue}>{redemptionCalc.pointsToRedeem}</Text>
              </View>
              
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Discount Amount:</Text>
                <Text style={[styles.calculationValue, styles.discountValue]}>
                  -₹{redemptionCalc.discountAmount.toFixed(0)}
                </Text>
              </View>
              
              <View style={[styles.calculationRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Final Amount:</Text>
                <Text style={styles.totalValue}>
                  ₹{redemptionCalc.remainingAmount.toFixed(0)}
                </Text>
              </View>
              
              <Text style={styles.savingsText}>
                You'll save ₹{redemptionCalc.discountAmount.toFixed(0)} on this order!
              </Text>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {redemptionCalc.errorMessage}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.limitsContainer}>
        <Text style={styles.limitsTitle}>Redemption Limits:</Text>
        <Text style={styles.limitsText}>
          • Minimum: {LOYALTY_CONFIG.minRedemption} points
        </Text>
        <Text style={styles.limitsText}>
          • Maximum: {Math.min(LOYALTY_CONFIG.maxRedemptionAmount / LOYALTY_CONFIG.redemptionRate, orderAmount * LOYALTY_CONFIG.maxRedemptionPercentage / LOYALTY_CONFIG.redemptionRate).toFixed(0)} points for this order
        </Text>
        <Text style={styles.limitsText}>
          • Rate: {(1 / LOYALTY_CONFIG.redemptionRate).toFixed(0)} points = ₹1
        </Text>
      </View>
    </View>
  );
};

// Custom Hook for Managing Loyalty Points
export const useLoyaltyPoints = (userId: string) => {
  const [availablePoints, setAvailablePoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const points = await LoyaltyService.getUserLoyaltyPoints(userId);
      setAvailablePoints(points);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch points');
      console.error('Error refreshing points:', err);
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (
    orderId: string,
    orderAmount: number,
    description?: string,
    multiplier?: number
  ) => {
    try {
      await LoyaltyService.awardPoints(userId, orderId, orderAmount, description, multiplier);
      await refreshPoints(); // Refresh after awarding
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to award points';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const spendPoints = async (
    pointsToSpend: number,
    orderId: string,
    description?: string
  ) => {
    try {
      const result = await LoyaltyService.spendPoints(userId, pointsToSpend, orderId, description);
      if (result.success) {
        await refreshPoints(); // Refresh after spending
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to spend points';
      setError(errorMessage);
      return { success: false, actualPointsSpent: 0, error: errorMessage };
    }
  };

  const getPointsBreakdown = async () => {
    try {
      return await LoyaltyService.getPointsBreakdown(userId);
    } catch (err) {
      console.error('Error getting points breakdown:', err);
      return null;
    }
  };

  const checkExpiringPoints = async () => {
    try {
      return await LoyaltyService.getPointsNearExpiry(userId);
    } catch (err) {
      console.error('Error checking expiring points:', err);
      return { batches: [], totalPoints: 0, daysUntilExpiry: 0 };
    }
  };

  // Auto-refresh points when hook is initialized
  useEffect(() => {
    if (userId) {
      refreshPoints();
    }
  }, [userId]);

  return {
    availablePoints,
    loading,
    error,
    lastRefresh,
    refreshPoints,
    awardPoints,
    spendPoints,
    getPointsBreakdown,
    checkExpiringPoints,
  };
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 16,
  },
  noPointsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPointsText: {
    fontSize: 16,
    color: COLORS.primaryGreyHex,
    marginBottom: 8,
  },
  earnPointsText: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
    fontStyle: 'italic',
  },
  expiryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  useExpiringButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  useExpiringButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: 12,
    fontWeight: '600',
  },
  availablePointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  availablePointsLabel: {
    fontSize: 16,
    color: COLORS.primaryBlackHex,
    marginRight: 8,
  },
  availablePointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginRight: 8,
  },
  pointsWorth: {
    fontSize: 14,
    color: COLORS.primaryGreyHex,
  },
  inputContainer: {
    marginBottom: 16,
  },
  pointsInput: {
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.primaryWhiteHex,
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFEBEE',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  quickButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  clearButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  calculationContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  validCalculation: {
    gap: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calculationLabel: {
    fontSize: 14,
    color: COLORS.primaryBlackHex,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
  },
  discountValue: {
    color: '#4CAF50',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  savingsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  limitsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  limitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryBlackHex,
    marginBottom: 8,
  },
  limitsText: {
    fontSize: 12,
    color: COLORS.primaryGreyHex,
    marginBottom: 4,
    lineHeight: 16,
  },
});