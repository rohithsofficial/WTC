// PaymentScreen.tsx - Fixed implementation for first-time user discount
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS, FONTSIZE } from '../../src/theme/theme';
import { 
  loyaltyService,
  RedemptionCalculation, 
  DiscountCalculation, 
  OrderBreakdown,
  UserLoyaltyProfile
} from '../../src/services/loyaltyService';
import { OrderData } from '../../src/types/loyalty';
import { RedeemPointsInput } from '../../src/components/RedeemPointsInput';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '../../src/store/CartContext';
import { Timestamp } from 'firebase/firestore';

interface PaymentScreenProps {
  navigation?: any;
}

type DiscountType = 'flat_percentage' | 'points' | 'first_time' | 'none';

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dispatch } = useCart();
  
  // Parse state and amount from params with proper type checking
  const parsedState = React.useMemo(() => {
    try {
      const stateParam = params.state as string;
      return stateParam ? JSON.parse(stateParam) : { total: 0, items: [] };
    } catch (error) {
      console.error('Error parsing state:', error);
      return { total: 0, items: [] };
    }
  }, [params.state]);

  const amount = React.useMemo(() => {
    const amountParam = params.amount as string;
    return amountParam ? Number(amountParam) : parsedState.total || 0;
  }, [params.amount, parsedState.total]);

  // User and loyalty state
  const [loading, setLoading] = useState(true);
  const [userName] = useState(params.displayName as string || 'Guest');
  const [userId] = useState(params.userId as string || 'current_user_id');
  const [availablePoints, setAvailablePoints] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  
  // Discount state
  const [selectedDiscountType, setSelectedDiscountType] = useState<DiscountType>('none');
  const [discountCalculation, setDiscountCalculation] = useState<DiscountCalculation>({
    discountAmount: 0,
    discountType: 'none',
    isEligible: false
  });
  
  // Points redemption state
  const [redemptionCalculation, setRedemptionCalculation] = useState<RedemptionCalculation>({
    pointsToRedeem: 0,
    discountAmount: 0,
    remainingAmount: amount,
    isValid: false
  });

  // Payment state
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize user loyalty data with realtime listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeLoyaltyData = async () => {
      try {
        setLoading(true);
        
        // Subscribe to loyalty points changes
        const pointsUnsubscribe = loyaltyService.subscribeToLoyaltyPoints(userId, (points: number) => {
          setAvailablePoints(points);
        });

        // Subscribe to user profile changes
        const profileUnsubscribe = loyaltyService.subscribeToUserProfile(userId, (profile: UserLoyaltyProfile | null) => {
          if (profile) {
            setIsFirstTimeUser(profile.isFirstTimeUser);
          }
        });

        // Store both unsubscribe functions
        unsubscribe = () => {
          pointsUnsubscribe();
          profileUnsubscribe();
        };

      } catch (error) {
        console.error('Error loading loyalty data:', error);
        Alert.alert('Error', 'Failed to load loyalty information');
      } finally {
        setLoading(false);
      }
    };

    initializeLoyaltyData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Calculate default discount when data loads
  useEffect(() => {
    if (!loading && amount > 0) {
      // Check if user is first time user and calculate appropriate discount
      if (isFirstTimeUser) {
        const firstTimeDiscount = loyaltyService.calculateFirstTimeDiscount(amount);
        setDiscountCalculation({
          discountAmount: firstTimeDiscount.discountAmount,
          discountType: 'first_time',
          isEligible: firstTimeDiscount.isEligible
        });
        setSelectedDiscountType('first_time');
      } else {
        // Calculate flat percentage discount (10%)
        const flatDiscount = loyaltyService.calculateFlatDiscount(amount);
        setDiscountCalculation(flatDiscount);
        if (flatDiscount.isEligible) {
          setSelectedDiscountType('flat_percentage');
        }
      }
    }
  }, [loading, amount, isFirstTimeUser]);

  // Handle discount type selection
  const handleDiscountSelection = (discountType: DiscountType) => {
    // If user is first time, don't allow changing discount type
    if (isFirstTimeUser && discountType !== 'first_time') {
      Alert.alert(
        'First Time User',
        'You are eligible for the first time user discount. This cannot be changed.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If switching to points, reset other discounts
    if (discountType === 'points') {
      setDiscountCalculation({
        discountAmount: 0,
        discountType: 'none',
        isEligible: false
      });
    }
    // If switching to flat discount, reset points redemption
    else if (discountType === 'flat_percentage') {
      setRedemptionCalculation({
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: amount,
        isValid: false
      });
    }
    
    setSelectedDiscountType(discountType);
    
    // Calculate discount based on selected type
    switch (discountType) {
      case 'first_time':
        if (isFirstTimeUser) {
          const firstTimeDiscount = loyaltyService.calculateFirstTimeDiscount(amount);
          setDiscountCalculation({
            discountAmount: firstTimeDiscount.discountAmount,
            discountType: 'first_time',
            isEligible: firstTimeDiscount.isEligible
          });
        }
        break;
      
      case 'flat_percentage':
        const flatDiscount = loyaltyService.calculateFlatDiscount(amount);
        setDiscountCalculation(flatDiscount);
        break;
      
      case 'none':
        setDiscountCalculation({
          discountAmount: 0,
          discountType: 'none',
          isEligible: false
        });
        break;
    }
  };

  // Handle redemption calculation change from RedeemPointsInput
  const handleRedemptionChange = (calculation: RedemptionCalculation) => {
    setRedemptionCalculation(calculation);
  };

  // Get order breakdown with all calculations - FIXED VERSION
  const getOrderBreakdown = (): OrderBreakdown => {
    // For first-time users, always use first_time discount regardless of selectedDiscountType
    const effectiveDiscountType = isFirstTimeUser ? 'first_time' : selectedDiscountType;
    const effectivePointsToRedeem = effectiveDiscountType === 'points' ? redemptionCalculation.pointsToRedeem : 0;
    
    // console.log('getOrderBreakdown - effectiveDiscountType:', effectiveDiscountType);
    // console.log('getOrderBreakdown - isFirstTimeUser:', isFirstTimeUser);
    // console.log('getOrderBreakdown - selectedDiscountType:', selectedDiscountType);
    
    return loyaltyService.calculateOrderBreakdown(
      amount,
      effectiveDiscountType,
      effectivePointsToRedeem,
      isFirstTimeUser
    );
  };

  // Get best discount recommendation
  const getBestDiscount = () => {
    return loyaltyService.getBestDiscountRecommendation(
      amount,
      availablePoints,
      isFirstTimeUser
    );
  };

  // Calculate final amount to pay
  const getFinalAmount = (): number => {
    const breakdown = getOrderBreakdown();
    return breakdown.finalAmount;
  };

  // Calculate total savings
  const getTotalSavings = (): number => {
    const breakdown = getOrderBreakdown();
    return breakdown.discountApplied;
  };

  // Handle payment processing - FIXED VERSION
  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // For first-time users, ALWAYS use first_time discount
      const effectiveDiscountType = isFirstTimeUser ? 'first_time' : selectedDiscountType;
      const effectivePointsToRedeem = effectiveDiscountType === 'points' ? redemptionCalculation.pointsToRedeem : 0;
      
      console.log('handlePayment - effectiveDiscountType:', effectiveDiscountType);
      console.log('handlePayment - isFirstTimeUser:', isFirstTimeUser);
      console.log('handlePayment - selectedDiscountType:', selectedDiscountType);
      
      // Validate discount selection with effective discount type
      const validation = loyaltyService.validateDiscountSelection(
        effectiveDiscountType,
        effectivePointsToRedeem,
        availablePoints,
        amount,
        isFirstTimeUser
      );

      if (!validation.isValid) {
        Alert.alert('Invalid Selection', validation.errorMessage);
        return;
      }

      // Calculate breakdown with correct parameters
      const breakdown = loyaltyService.calculateOrderBreakdown(
        amount,
        effectiveDiscountType,
        effectivePointsToRedeem,
        isFirstTimeUser
      );
      
      console.log('Payment breakdown:', breakdown);
      
      // Process payment (integrate with your payment gateway here)
      const paymentSuccess = await processPaymentGateway(breakdown.finalAmount);
      
      if (paymentSuccess) {
        try {
          // Generate order ID first
          const orderId = generateOrderId(userName);

          // Process loyalty transaction
          const loyaltyResult = await loyaltyService.processOrder(
            userId,
            amount,
            breakdown.finalAmount,
            effectiveDiscountType,
            breakdown.pointsUsed,
            isFirstTimeUser
          );

          // Create transaction record with order information
          const orderDataRecord = await loyaltyService.createTransactionRecord(
            orderId,
            userId,
            {
              originalAmount: breakdown.originalAmount,
              discountType: effectiveDiscountType === 'points' ? 'redeem' : 
                           effectiveDiscountType === 'flat_percentage' ? 'flat10' : 
                           effectiveDiscountType === 'first_time' ? 'first_time' : 'none',
              pointsUsed: breakdown.pointsUsed,
              discountValue: breakdown.discountApplied,
              finalAmountPaid: breakdown.finalAmount,
              pointsEarned: loyaltyResult.pointsEarned,
              timestamp: new Date(),
              description: effectiveDiscountType === 'first_time' ? 'First time user discount' :
                         effectiveDiscountType === 'flat_percentage' ? '10% flat discount' :
                         effectiveDiscountType === 'points' ? 'Points redemption' : 'No discount',
              items: parsedState.items.map((item: { price: string | number; [key: string]: any }) => ({
                ...item,
                price: Number(item.price) || 0 // Ensure price is a number
              })),
              orderType: parsedState.orderType || 'regular',
              tableNumber: parsedState.tableNumber || '',
              baristaNotes: parsedState.baristaNotes || ''
            }
          );

          // Clear cart after successful order
          dispatch({ type: 'CLEAR_CART' });

          // Navigate to order status screen with all order data
          router.push({
            pathname: '/(app)/OrderStatusScreen',
            params: {
              orderId: orderId,
              orderData: JSON.stringify(orderDataRecord),
              success: 'true'
            }
          });
        } catch (error) {
          console.error('Error processing order:', error);
          Alert.alert('Error', 'Failed to process order. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Failed', 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock functions - replace with your implementations
  const processPaymentGateway = async (amount: number): Promise<boolean> => {
    // Integrate with your payment gateway
    return new Promise(resolve => setTimeout(() => resolve(true), 2000));
  };

  function generateOrderId(userName : string): string {
    const date = new Date();
    const shortDate = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const cleanUsername = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6); // Max 6 chars
    const random = Math.random().toString(36).substr(2, 4).toUpperCase(); // 4-char random

    return `ORD-${cleanUsername}-${shortDate}-${random}`;
  }

  if (loading) {
    return (
      <View style={styles.LoadingContainer}>
        <Text style={styles.LoadingText}>Loading...</Text>
      </View>
    );
  }

  const breakdown = getOrderBreakdown();
  const bestDiscount = getBestDiscount();

  return (
    <ScrollView style={styles.ScreenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.HeaderContainer}>
        <Text style={styles.HeaderTitle}>Payment</Text>
        <Text style={styles.HeaderSubtitle}>Choose your discount and complete payment</Text>
      </View>

      {/* Debug Info - Remove in production */}
      {__DEV__ && (
        <View style={styles.DebugContainer}>
          <Text style={styles.DebugText}>Debug Info:</Text>
          <Text style={styles.DebugText}>isFirstTimeUser: {isFirstTimeUser.toString()}</Text>
          <Text style={styles.DebugText}>selectedDiscountType: {selectedDiscountType}</Text>
          <Text style={styles.DebugText}>effectiveType: {isFirstTimeUser ? 'first_time' : selectedDiscountType}</Text>
        </View>
      )}

      {/* Best Discount Recommendation */}
      <View style={styles.RecommendationContainer}>
        <Text style={styles.RecommendationTitle}>💡 Best Deal</Text>
        <Text style={styles.RecommendationText}>{bestDiscount.description}</Text>
      </View>

      {/* Discount Options */}
      <View style={styles.DiscountOptionsContainer}>
        <Text style={styles.DiscountOptionsTitle}>Choose Your Discount</Text>
        
        {/* First Time User Discount */}
        {isFirstTimeUser && (
          <TouchableOpacity 
            style={[
              styles.DiscountOption, 
              { borderColor: COLORS.primaryOrangeHex } // Always highlighted for first-time users
            ]}
            onPress={() => handleDiscountSelection('first_time')}
          >
            <View style={styles.DiscountOptionHeader}>
              <Text style={styles.DiscountOptionTitle}>🎁 First Time User Special</Text>
              <Text style={styles.DiscountOptionAmount}>
                ₹{loyaltyService.calculateFirstTimeDiscount(amount).discountAmount} OFF
              </Text>
            </View>
            <Text style={styles.DiscountOptionDescription}>
              Welcome bonus! Get ₹100 off your first order (or full amount if order is less than ₹100).
            </Text>
            <View style={styles.AppliedDiscountContainer}>
              <Text style={styles.AppliedDiscountText}>✓ First Time User Discount Applied (Cannot be changed)</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Flat 10% Discount - Only show if not first time user */}
        {!isFirstTimeUser && (
          <TouchableOpacity 
            style={[
              styles.DiscountOption, 
              { borderColor: selectedDiscountType === 'flat_percentage' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex }
            ]}
            onPress={() => handleDiscountSelection('flat_percentage')}
          >
            <View style={styles.DiscountOptionHeader}>
              <Text style={styles.DiscountOptionTitle}>🔥 Flat 10% OFF</Text>
              <Text style={styles.DiscountOptionAmount}>
                ₹{loyaltyService.calculateFlatDiscount(amount).discountAmount} OFF
              </Text>
            </View>
            <Text style={styles.DiscountOptionDescription}>
              Save 10% on orders above ₹100. Simple and straightforward!
            </Text>
            {selectedDiscountType === 'flat_percentage' && (
              <View style={styles.AppliedDiscountContainer}>
                <Text style={styles.AppliedDiscountText}>✓ 10% Discount Applied</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Points Redemption - Only show if not first time user and has points */}
        {!isFirstTimeUser && availablePoints > 0 && (
          <TouchableOpacity 
            style={[
              styles.DiscountOption, 
              { borderColor: selectedDiscountType === 'points' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex }
            ]}
            onPress={() => handleDiscountSelection('points')}
          >
            <View style={styles.DiscountOptionHeader}>
              <Text style={styles.DiscountOptionTitle}>⭐ Use Loyalty Points</Text>
              <Text style={styles.DiscountOptionAmount}>
                Up to ₹{Math.min(availablePoints, amount)} OFF
              </Text>
            </View>
            <Text style={styles.DiscountOptionDescription}>
              Use your earned points. 1 point = ₹1 discount.
            </Text>
            {selectedDiscountType === 'points' && (
              <View style={styles.AppliedDiscountContainer}>
                <Text style={styles.AppliedDiscountText}>✓ Points Redemption Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* No Discount Option - Only show if not first time user */}
        {!isFirstTimeUser && (
          <TouchableOpacity 
            style={[
              styles.DiscountOption, 
              { borderColor: selectedDiscountType === 'none' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex }
            ]}
            onPress={() => handleDiscountSelection('none')}
          >
            <View style={styles.DiscountOptionHeader}>
              <Text style={styles.DiscountOptionTitle}>💳 No Discount</Text>
              <Text style={styles.DiscountOptionAmount}>₹0 OFF</Text>
            </View>
            <Text style={styles.DiscountOptionDescription}>
              Pay full amount and earn maximum loyalty points.
            </Text>
            {selectedDiscountType === 'none' && (
              <View style={styles.AppliedDiscountContainer}>
                <Text style={styles.AppliedDiscountText}>✓ No Discount Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Points Redemption Input - Only show for non-first-time users */}
      {!isFirstTimeUser && selectedDiscountType === 'points' && availablePoints > 0 && (
        <RedeemPointsInput
          availablePoints={availablePoints}
          orderAmount={amount}
          onRedemptionChange={handleRedemptionChange}
          disabled={isProcessing}
        />
      )}

      {/* Order Summary */}
      <View style={styles.OrderSummaryContainer}>
        <Text style={styles.OrderSummaryTitle}>Order Summary</Text>
        
        <View style={styles.SummaryRow}>
          <Text style={styles.SummaryLabel}>Original Amount:</Text>
          <Text style={styles.SummaryValue}>₹{Number(breakdown.originalAmount).toFixed(2)}</Text>
        </View>
        
        {breakdown.discountApplied > 0 && (
          <View style={styles.SummaryRow}>
            <Text style={styles.SummaryLabel}>
              {isFirstTimeUser ? 'First Time User Discount:' : 'Discount Applied:'}
            </Text>
            <Text style={[styles.SummaryValue, styles.DiscountValue]}>
              -₹{breakdown.discountApplied}
            </Text>
          </View>
        )}
        
        <View style={[styles.SummaryRow, styles.TotalRow]}>
          <Text style={styles.TotalLabel}>You Pay:</Text>
          <Text style={styles.TotalValue}>₹{Number(breakdown.finalAmount).toFixed(2)}</Text>
        </View>
        
        <View style={styles.SummaryRow}>
          <Text style={styles.SummaryLabel}>Points You'll Earn:</Text>
          <Text style={[styles.SummaryValue, styles.PointsValue]}>
            +{breakdown.pointsEarned} points
          </Text>
        </View>
      </View>

      {/* Payment Button */}
      <TouchableOpacity 
        style={[styles.PaymentButton, isProcessing && styles.PaymentButtonDisabled]}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        <Text style={styles.PaymentButtonText}>
          {isProcessing ? 'Processing...' : `Pay ₹${Number(getFinalAmount()).toFixed(2)}`}
        </Text>
        {getTotalSavings() > 0 && (
          <Text style={styles.PaymentButtonSubtext}>
            You're saving ₹{getTotalSavings()}! {isFirstTimeUser && '(First Time User Bonus)'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Points Info */}
      <View style={styles.PointsInfoContainer}>
        <Text style={styles.PointsInfoText}>
          💰 You currently have {availablePoints} loyalty points (₹{availablePoints} value)
        </Text>
        <Text style={styles.PointsInfoSubtext}>
          {isFirstTimeUser 
            ? 'After your first purchase, you can start earning and using loyalty points!'
            : 'Earn more points with every purchase and redeem them for discounts!'
          }
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  ScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
    paddingHorizontal: 20,
  },
  LoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  LoadingText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
  },
  DebugContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  DebugText: {
    color: COLORS.primaryOrangeHex,
    fontSize: FONTSIZE.size_12,
  },
  HeaderContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryGreyHex,
    marginBottom: 20,
  },
  HeaderTitle: {
    fontSize: FONTSIZE.size_24,
    fontWeight: '700',
    color: COLORS.primaryWhiteHex,
    marginBottom: 8,
  },
  HeaderSubtitle: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  RecommendationContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryOrangeHex,
  },
  RecommendationTitle: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
    color: COLORS.primaryOrangeHex,
    marginBottom: 8,
  },
  RecommendationText: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  DiscountOptionsContainer: {
    marginBottom: 20,
  },
  DiscountOptionsTitle: {
    fontSize: FONTSIZE.size_18,
    fontWeight: '600',
    color: COLORS.primaryWhiteHex,
    marginBottom: 16,
  },
  DiscountOption: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  DiscountOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  DiscountOptionTitle: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
    color: COLORS.primaryWhiteHex,
  },
  DiscountOptionAmount: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '700',
    color: COLORS.primaryOrangeHex,
  },
  DiscountOptionDescription: {
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginBottom: 8,
  },
  AppliedDiscountContainer: {
    backgroundColor: `${COLORS.primaryOrangeHex}20`,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  AppliedDiscountText: {
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
    fontWeight: '500',
    textAlign: 'center',
  },
  OrderSummaryContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  OrderSummaryTitle: {
    fontSize: FONTSIZE.size_18,
    fontWeight: '600',
    color: COLORS.primaryWhiteHex,
    marginBottom: 16,
  },
  SummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  TotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryGreyHex,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  SummaryLabel: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  SummaryValue: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    fontWeight: '500',
  },
  DiscountValue: {
    color: COLORS.primaryOrangeHex,
  },
  PointsValue: {
    color: COLORS.primaryOrangeHex,
  },
  TotalLabel: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '700',
    color: COLORS.primaryWhiteHex,
  },
  TotalValue: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '700',
    color: COLORS.primaryOrangeHex,
  },
  PaymentButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  PaymentButtonDisabled: {
    opacity: 0.6,
  },
  PaymentButtonText: {
    fontSize: FONTSIZE.size_18,
    fontWeight: '700',
    color: COLORS.primaryWhiteHex,
  },
  PaymentButtonSubtext: {
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    marginTop: 4,
    opacity: 0.8,
  },
  PointsInfoContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  PointsInfoText: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: 8,
  },
  PointsInfoSubtext: {
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PaymentScreen;