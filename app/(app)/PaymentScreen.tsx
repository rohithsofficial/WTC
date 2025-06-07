import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import PaymentMethod from '../../src/components/PaymentMethod';
import PaymentFooter from '../../src/components/PaymentFooter';
import { LinearGradient } from 'expo-linear-gradient';
import CustomIcon from '../../src/components/CustomIcon';
import { useStore } from '../../src/store/store';
import PopUpAnimation from '../../src/components/PopUpAnimation';
import LoyaltyPointsDisplay from '../../src/components/LoyaltyPointsDisplay';
import { RedeemPointsInput } from '../../src/components/RedeemPointsInput';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import type { OrderData } from '../../src/types/interfaces';
import type { RedemptionCalculation, TierDiscountCalculation, MembershipTier } from '../../src/types/loyalty';
import { LOYALTY_CONFIG } from '../../src/types/loyalty';
import { auth } from '../../src/firebase/config';
import { LoyaltyService } from '../../src/services/loyaltyService';
import { useCart } from '../../src/store/CartContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// Payment Method Types
type PaymentModeType = 'credit-card' | 'paypal' | 'google-pay' | 'apple-pay' | 'cash';
type DiscountType = 'none' | 'loyalty' | 'tier';

const PaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { clearCart: clearCartContext } = useCart();

  const toString = (param: string | string[] | undefined): string => {
    if (!param) return '';
    return Array.isArray(param) ? param[0] : param;
  };

  const amountStr = toString(params.total);
  const amount = amountStr ? Number(amountStr) : 0;
  const itemsStr = toString(params.items);
  const userId = toString(params.userId);
  const displayName = toString(params.displayName);
  const orderType = toString(params.orderType);
  const tableNumber = toString(params.tableNumber);

  let items: any[] = [];
  if (itemsStr) {
    try {
      items = JSON.parse(itemsStr);
      console.log("Successfully parsed items from params:", items.length);
    } catch (error) {
      console.warn('Failed to parse items from params:', error);
      items = [];
    }
  }

  // Getting state and actions from the store
  const {
    calculateCartPrice,
    CartList,
    removeFromCart,
    clearCart: storeClearCart
  } = useStore();

  const [paymentMode, setPaymentMode] = useState<PaymentModeType>('credit-card');
  const [showAnimation, setShowAnimation] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Loyalty points state
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('Bronze');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [redemptionCalculation, setRedemptionCalculation] = useState<RedemptionCalculation>({
    pointsToRedeem: 0,
    discountAmount: 0,
    remainingAmount: amount,
    isValid: false
  });
  const [tierDiscountCalculation, setTierDiscountCalculation] = useState<TierDiscountCalculation>({
    discountAmount: 0,
    discountType: 'none',
    maxDiscountLimit: 0,
    isEligible: false
  });
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [isFestival, setIsFestival] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [nextMilestone, setNextMilestone] = useState({ pointsNeeded: 0, rewardValue: 0 });
  const [bestDiscount, setBestDiscount] = useState<{
    tierDiscount: TierDiscountCalculation;
    pointsRedemption: RedemptionCalculation;
    recommendedOption: 'tier' | 'points' | 'none';
  } | null>(null);

  // Calculated values based on selected discount
  const subtotalAmount = amount;
  let discountAmount = 0;
  let pointsUsed = 0;

  if (discountType === 'loyalty' && redemptionCalculation.isValid) {
    discountAmount = redemptionCalculation.discountAmount;
    pointsUsed = redemptionCalculation.pointsToRedeem;
  } else if (discountType === 'tier' && tierDiscountCalculation.isEligible) {
    discountAmount = tierDiscountCalculation.discountAmount;
    pointsUsed = 0; // Tier discounts don't consume points
  }

  const finalAmount = subtotalAmount - discountAmount;
  const pointsToEarn = LoyaltyService.calculatePointsEarned(finalAmount);

  const PaymentList = [
    { name: 'Credit Card', icon: 'credit-card', isIcon: true, value: 'credit-card' as PaymentModeType },
    { name: 'PayPal', icon: 'paypal', isIcon: true, value: 'paypal' as PaymentModeType },
    { name: 'Google Pay', icon: 'google', isIcon: true, value: 'google-pay' as PaymentModeType },
    { name: 'Apple Pay', icon: 'apple', isIcon: true, value: 'apple-pay' as PaymentModeType },
    { name: 'Cash', icon: 'cash', isIcon: false, value: 'cash' as PaymentModeType },
  ];

  // Load user data and check conditions
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const profile = await LoyaltyService.getUserProfile(user.uid);
        if (profile) {
          // Assume it's the first order if loyaltyPoints is 0
          setIsFirstOrder(profile.loyaltyPoints === 0);
          setMembershipTier(profile.membershipTier);
          
          // Check if it's user's birthday (using a separate state or variable)
          const today = new Date();
          // You can implement your own birthday check logic here
          // For example, you might have a separate state or variable for birthday
          const isUserBirthday = false; // Replace with your birthday check logic
          setIsBirthday(isUserBirthday);

          // Check if it's a festival day (you can implement your festival logic here)
          setIsFestival(false);
        } else {
          console.error('User profile not found.');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Load loyalty points with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const loadLoyaltyPoints = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;

          const points = await LoyaltyService.getUserLoyaltyPoints(user.uid);
          setAvailablePoints(points);
          
          // Also update next milestone
          const milestone = LoyaltyService.getNextRewardMilestone(points);
          setNextMilestone(milestone);
        } catch (error) {
          console.error('Error loading loyalty points:', error);
        } finally {
          setLoadingPoints(false);
        }
      };

      loadLoyaltyPoints();
    }, [])
  );

  // Calculate tier discount when points or membership tier changes
  useEffect(() => {
    if (availablePoints >= 0 && membershipTier && amount > 0) {
      const tierDiscount = LoyaltyService.calculateTierDiscount(
        amount,
        membershipTier,
        availablePoints
      );
      setTierDiscountCalculation(tierDiscount);
    }
  }, [availablePoints, membershipTier, amount]);

  // Calculate redemption when points input changes
  useEffect(() => {
    const points = parseInt(pointsToRedeem) || 0;
    if (points > 0 && availablePoints > 0) {
      const calculation = LoyaltyService.calculateRedemption(
        points,
        availablePoints,
        amount
      );
      setRedemptionCalculation(calculation);
    } else {
      // Reset calculation if points are invalid
      setRedemptionCalculation({
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: amount,
        isValid: false,
        errorMessage: points > availablePoints ? 'Insufficient points' : 'Enter valid points'
      });
    }
  }, [pointsToRedeem, availablePoints, amount]);

  // Calculate best discount option
  useEffect(() => {
    if (availablePoints >= 0 && membershipTier) {
      const bestOption = LoyaltyService.getBestAvailableDiscount(
        amount,
        membershipTier,
        availablePoints,
        parseInt(pointsToRedeem) || 0
      );
      setBestDiscount(bestOption);
    }
  }, [amount, membershipTier, availablePoints, pointsToRedeem]);

  // Calculate next milestone when available points change
  useEffect(() => {
    if (availablePoints > 0) {
      const milestone = LoyaltyService.getNextRewardMilestone(availablePoints);
      setNextMilestone(milestone);
    }
  }, [availablePoints]);

  // Handle points redemption
  const handlePointsRedeem = () => {
    if (!redemptionCalculation || !redemptionCalculation.isValid) {
      Alert.alert('Invalid Redemption', redemptionCalculation?.errorMessage || 'Please enter valid points');
      return;
    }

    setDiscountType('loyalty');
  };

  // Handle tier discount application
  const handleTierDiscount = () => {
    if (!tierDiscountCalculation.isEligible) {
      Alert.alert('Not Eligible', tierDiscountCalculation.reasonNotEligible || 'You are not eligible for tier discount');
      return;
    }

    setDiscountType('tier');
  };

  // Reset all discounts
  const resetDiscounts = () => {
    setDiscountType('none');
    setPointsToRedeem('');
    setRedemptionCalculation({
      pointsToRedeem: 0,
      discountAmount: 0,
      remainingAmount: amount,
      isValid: false,
      errorMessage: ''
    });
  };

  // Apply best discount automatically
  const applyBestDiscount = () => {
    if (!bestDiscount) return;

    if (bestDiscount.recommendedOption === 'tier') {
      setDiscountType('tier');
    } else if (bestDiscount.recommendedOption === 'points') {
      setDiscountType('loyalty');
    }
  };

  // Save order to Firestore
  const saveOrderToFirestore = async (orderData: OrderData) => {
    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Order saved with ID: ", docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("Error saving order: ", e);
      throw e;
    }
  };

  // Process loyalty points transaction
  const processLoyaltyTransaction = async (orderId: string) => {
    if (!auth.currentUser) return;

    try {
      await LoyaltyService.processOrderCompletion(
        auth.currentUser.uid,
        orderId,
        subtotalAmount,
        discountType === 'loyalty' ? pointsUsed : 0,
        discountType === 'tier' ? discountAmount : 0,
        displayName || auth.currentUser.displayName || 'User',
        isFirstOrder,
        isBirthday,
        isFestival
      );
    } catch (error) {
      console.error('Error processing loyalty transaction:', error);
      // Don't throw here as the order was already placed successfully
    }
  };

  // Add items to store if needed
  useEffect(() => {
    const syncItemsToStore = async () => {
      try {
        // Only sync if CartList is empty but we have items in params
        if ((!CartList || CartList.length === 0) && items && items.length > 0) {
          console.log("Syncing items from params to store:", items);
          // You might need to implement a function to add items to store
          // For now, we'll work with the items from params
        }
      } catch (error) {
        console.error("Error syncing items to store:", error);
      }
    };
    
    syncItemsToStore();
  }, []);

  // Clear cart function
  const handleClearCart = async () => {
    try {
      // Clear the cart using the CartContext method
      clearCartContext();
      
      // Clear the store cart
      storeClearCart();
      
      // Show success animation
      setShowAnimation(true);
      
      // Navigate back after animation
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (error) {
      console.error('Error clearing cart:', error);
      Alert.alert('Error', 'Failed to clear cart. Please try again.');
    }
  };

  // Main payment processing function
  const buttonPressHandler = async () => {
    if (isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Validate selected discount
      if (discountType === 'loyalty' && pointsUsed > availablePoints) {
        Alert.alert('Error', 'Insufficient loyalty points');
        return;
      }

      if (discountType === 'tier' && !tierDiscountCalculation.isEligible) {
        Alert.alert('Error', 'Not eligible for tier discount');
        return;
      }

      // Create order data with correct discount calculations
      const orderData: OrderData = {
        userId: userId || auth.currentUser?.uid || 'guest',
        displayName: displayName || auth.currentUser?.displayName || 'Guest',
        items: items.length > 0 ? items : CartList,
        totalAmount: subtotalAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        pointsRedeemed: discountType === 'loyalty' ? pointsUsed : 0,
        pointsEarned: pointsToEarn,
        paymentMethod: paymentMode,
        paymentMode: paymentMode,
        orderType: orderType || 'dine-in',
        tableNumber: tableNumber || '',
        status: 'Order Placed',
        timestamp: new Date(),
        orderDate: new Date().toISOString().split('T')[0],
        orderStatus: 'Order Placed',
        paymentStatus: 'pending',
        createdAt: new Date()
      };

      // Save order to Firestore
      const savedOrderId = await saveOrderToFirestore(orderData);
      setOrderId(savedOrderId);

      // Process loyalty points transaction
      await processLoyaltyTransaction(savedOrderId);

      // Update order status to paid
      const orderRef = doc(db, "orders", savedOrderId);
      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        status: 'Order Placed',
        orderStatus: 'Order Placed',
        updatedAt: new Date()
      });

      // Clear the cart and wait for it to complete
      await handleClearCart();

      // Reset all selections
      setPaymentMode('credit-card');
      setDiscountType('none');
      setPointsToRedeem('');
      setRedemptionCalculation({
        pointsToRedeem: 0,
        discountAmount: 0,
        remainingAmount: amount,
        isValid: false
      });
      setTierDiscountCalculation({
        discountAmount: 0,
        discountType: 'none',
        maxDiscountLimit: 0,
        isEligible: false
      });

      // Show success animation
      setShowAnimation(true);

      // Navigate to order confirmation after animation
      setTimeout(() => {
        setShowAnimation(false);
        router.push({
          pathname: '/OrderStatusScreen',
          params: {
            orderId: savedOrderId,
            success: 'true'
          }
        });
      }, 2000);

    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert(
        'Payment Failed',
        'There was an error processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Get tier color for styling
  const getTierColor = (tier: MembershipTier) => {
    const tierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === tier);
    return tierConfig?.color || COLORS.primaryGreyHex;
  };

  return (
    <View style={styles.ScreenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
      
      {/* Success Animation */}
      {showAnimation && (
        <PopUpAnimation
          style={styles.LottieAnimation}
          source={require('../../src/lottie/successful.json')}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ScrollViewFlex}>
        
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.HeaderContainer}>
          <TouchableOpacity
            onPress={() => router.back()}>
            <GradientBGIcon
              name="left"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.HeaderText}>Payment</Text>
          <View style={styles.EmptyView} />
        </Animated.View>

        {/* Order Summary Section */}
        <Animated.View 
          entering={FadeInUp.delay(300).springify()}
          style={styles.PaymentContainer}>
          <Text style={styles.PaymentHeaderText}>Order Summary</Text>
          
          <View style={styles.PriceRow}>
            <Text style={styles.PriceText}>Subtotal</Text>
            <Text style={styles.PriceText}>₹ {subtotalAmount.toFixed(2)}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.PriceRow}>
              <Text style={[styles.PriceText, { color: COLORS.primaryOrangeHex }]}>
                {discountType === 'tier' ? 
                  `${membershipTier} Tier Discount` : 
                  `Loyalty Discount (${pointsUsed} points)`}
              </Text>
              <Text style={[styles.PriceText, { color: COLORS.primaryOrangeHex }]}>
                -₹ {discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.PriceRow, styles.TotalRow]}>
            <Text style={styles.TotalText}>Total Amount</Text>
            <Text style={styles.TotalText}>₹ {finalAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.PriceRow}>
            <Text style={[styles.PriceText, { color: COLORS.primaryGreenHex }]}>
              Points to Earn
            </Text>
            <Text style={[styles.PriceText, { color: COLORS.primaryGreenHex }]}>
              +{pointsToEarn}
            </Text>
          </View>
        </Animated.View>

        {/* Payment Methods Section */}
        {/* <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={styles.PaymentContainer}>
          <Text style={styles.PaymentHeaderText}>Payment Options</Text>
          
          <TouchableOpacity onPress={() => setPaymentMode('credit-card')}>
            <View style={[
              styles.CreditCardContainer,
              { borderColor: paymentMode === 'credit-card' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex }
            ]}>
              <Text style={styles.CreditCardTitle}>Credit Card</Text>
              <View style={styles.CreditCardBG}>
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  colors={[COLORS.primaryGreyHex, COLORS.primaryBlackHex]}
                  style={styles.LinearGradientStyle}>
                  <View style={styles.CreditCardRow}>
                    <CustomIcon
                      name="chip"
                      size={FONTSIZE.size_20}
                      color={COLORS.primaryOrangeHex}
                    />
                    <CustomIcon
                      name="visa"
                      size={FONTSIZE.size_30}
                      color={COLORS.primaryWhiteHex}
                    />
                  </View>
                  <View style={styles.CreditCardNumberContainer}>
                    <Text style={styles.CreditCardNumber}>3879</Text>
                    <Text style={styles.CreditCardNumber}>8924</Text>
                    <Text style={styles.CreditCardNumber}>6745</Text>
                    <Text style={styles.CreditCardNumber}>4638</Text>
                  </View>
                  <View style={styles.CreditCardRow}>
                    <View style={styles.CreditCardNameContainer}>
                      <Text style={styles.CreditCardNameSubtitle}>
                        Card Holder Name
                      </Text>
                      <Text style={styles.CreditCardNameTitle}>
                        {displayName || 'Card Holder'}
                      </Text>
                    </View>
                    <View style={styles.CreditCardDateContainer}>
                      <Text style={styles.CreditCardNameSubtitle}>
                        Expiry Date
                      </Text>
                      <Text style={styles.CreditCardNameTitle}>02/30</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </TouchableOpacity>

          {PaymentList.slice(1).map((data, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setPaymentMode(data.value)}>
              <PaymentMethod
                paymentMode={paymentMode === data.value ? data.name : ''}
                name={data.name}
                icon={data.icon}
                isIcon={data.isIcon}
              />
            </TouchableOpacity>
          ))}
        </Animated.View> */}

        {/* Loyalty & Rewards Section */}
        <Animated.View 
          entering={FadeInUp.delay(500).springify()}
          style={[styles.PaymentContainer, { backgroundColor: COLORS.primaryBlackHex }]}>
          <Text style={[styles.PaymentHeaderText, { color: COLORS.primaryWhiteHex }]}>Loyalty & Rewards</Text>
          
          {/* Best Discount Recommendation */}
          {bestDiscount && bestDiscount.recommendedOption !== 'none' && discountType === 'none' && (
            <TouchableOpacity 
              style={[styles.BestDiscountContainer, { backgroundColor: COLORS.primaryDarkGreyHex }]} 
              onPress={applyBestDiscount}>
              <View style={styles.BestDiscountHeader}>
                <View style={styles.BestDiscountTitleContainer}>
                  <CustomIcon
                    name="star"
                    size={FONTSIZE.size_20}
                    color={COLORS.primaryOrangeHex}
                  />
                  <Text style={styles.BestDiscountTitle}>Recommended Offer</Text>
                </View>
                <Text style={styles.BestDiscountAmount}>
                  Save ₹{bestDiscount.recommendedOption === 'tier' ? 
                    bestDiscount.tierDiscount.discountAmount.toFixed(2) : 
                    bestDiscount.pointsRedemption.discountAmount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.BestDiscountDescription}>
                {bestDiscount.recommendedOption === 'tier' ? 
                  `Use your ${membershipTier} tier discount` : 
                  `Redeem ${bestDiscount.pointsRedemption.pointsToRedeem} loyalty points`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Discount Options */}
          <View style={styles.DiscountOptionsContainer}>
            {/* Tier Discount Option */}
            <TouchableOpacity 
              onPress={() => discountType === 'tier' ? resetDiscounts() : handleTierDiscount()}
              style={[
                styles.DiscountOption, 
                { 
                  backgroundColor: discountType === 'tier' ? COLORS.primaryOrangeHex + '20' : COLORS.primaryDarkGreyHex,
                  borderColor: discountType === 'tier' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex 
                }
              ]}>
              <View style={styles.DiscountOptionHeader}>
                <View style={styles.DiscountOptionTitleContainer}>
                  <CustomIcon
                    name="crown"
                    size={FONTSIZE.size_20}
                    color={discountType === 'tier' ? COLORS.primaryOrangeHex : getTierColor(membershipTier)}
                  />
                  <Text style={[
                    styles.DiscountOptionTitle,
                    { color: discountType === 'tier' ? COLORS.primaryOrangeHex : COLORS.primaryWhiteHex }
                  ]}>
                    {membershipTier} Tier Discount
                  </Text>
                </View>
                <Text style={[
                  styles.DiscountOptionAmount,
                  { color: tierDiscountCalculation.isEligible ? COLORS.primaryGreenHex : COLORS.primaryRedHex }
                ]}>
                  {tierDiscountCalculation.isEligible ? 
                    `₹${tierDiscountCalculation.discountAmount.toFixed(2)}` : 
                    'Not Eligible'}
                </Text>
              </View>
              
              {tierDiscountCalculation.isEligible ? (
                <View>
                  <Text style={[
                    styles.DiscountOptionDescription,
                    { color: discountType === 'tier' ? COLORS.primaryOrangeHex : COLORS.primaryLightGreyHex }
                  ]}>
                    {tierDiscountCalculation.savingsMessage}
                  </Text>
                  {discountType === 'tier' && (
                    <View style={styles.AppliedDiscountContainer}>
                      <CustomIcon
                        name="check-circle"
                        size={FONTSIZE.size_20}
                        color={COLORS.primaryGreenHex}
                      />
                      <Text style={styles.AppliedDiscountText}>Tier Discount Applied</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.DiscountOptionError}>
                  {tierDiscountCalculation.reasonNotEligible}
                </Text>
              )}
            </TouchableOpacity>

            {/* Points Redemption Option */}
            <TouchableOpacity 
              onPress={() => discountType === 'loyalty' ? resetDiscounts() : handlePointsRedeem()}
              style={[
                styles.DiscountOption, 
                { 
                  backgroundColor: discountType === 'loyalty' ? COLORS.primaryOrangeHex + '20' : COLORS.primaryDarkGreyHex,
                  borderColor: discountType === 'loyalty' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex 
                }
              ]}>
              <View style={styles.DiscountOptionHeader}>
                <View style={styles.DiscountOptionTitleContainer}>
                  <CustomIcon
                    name="gift"
                    size={FONTSIZE.size_20}
                    color={discountType === 'loyalty' ? COLORS.primaryOrangeHex : COLORS.primaryOrangeHex}
                  />
                  <Text style={[
                    styles.DiscountOptionTitle,
                    { color: discountType === 'loyalty' ? COLORS.primaryOrangeHex : COLORS.primaryWhiteHex }
                  ]}>
                    Redeem Points
                  </Text>
                </View>
                <Text style={styles.DiscountOptionAmount}>
                  {availablePoints} points
                </Text>
              </View>

              {discountType !== 'loyalty' ? (
                <View style={styles.PointsInputContainer}>
                  <RedeemPointsInput
                    availablePoints={availablePoints}
                    orderAmount={amount}
                    onRedemptionChange={setRedemptionCalculation}
                    disabled={false}
                  />
                  
                  {redemptionCalculation.isValid && (
                    <TouchableOpacity 
                      style={styles.ApplyDiscountButton}
                      onPress={handlePointsRedeem}>
                      <Text style={styles.ApplyDiscountButtonText}>
                        Apply Points (₹{redemptionCalculation.discountAmount.toFixed(2)} off)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {redemptionCalculation.errorMessage && (
                    <Text style={styles.DiscountOptionError}>
                      {redemptionCalculation.errorMessage}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.AppliedDiscountContainer}>
                  <CustomIcon
                    name="check-circle"
                    size={FONTSIZE.size_20}
                    color={COLORS.primaryGreenHex}
                  />
                  <Text style={styles.AppliedDiscountText}>
                    {pointsUsed} points redeemed for ₹{discountAmount.toFixed(2)} discount
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Payment Footer */}
      <PaymentFooter
        buttonTitle={isProcessingPayment ? 'Processing...' : `Pay ₹ ${finalAmount.toFixed(2)}`}
        price={{ 
          price: finalAmount.toString(), 
          currency: '₹',
          originalPrice: discountAmount > 0 ? subtotalAmount.toString() : undefined,
          discount: discountAmount > 0 ? discountAmount.toString() : undefined
        }}
        buttonPressHandler={buttonPressHandler}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  ScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
  },
  LottieAnimation: {
    height: 250,
  },
  ScrollViewFlex: {
    flexGrow: 1,
  },
  HeaderContainer: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  HeaderText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
  },
  EmptyView: {
    height: SPACING.space_36,
    width: SPACING.space_36,
  },
  PaymentContainer: {
    padding: SPACING.space_15,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryGreyHex,
  },
  PaymentHeaderText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_16,
  },
  PointsInputContainer: {
    marginTop: SPACING.space_16,
  },
  RedeemButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_10,
    alignItems: 'center',
    marginTop: SPACING.space_12,
  },
  RedeemButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  ResetButton: {
    backgroundColor: COLORS.primaryRedHex,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_8,
  },
  ResetButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  CreditCardContainer: {
    padding: SPACING.space_10,
    gap: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_15,
    borderWidth: 3,
  },
  CreditCardTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_10,
  },
  CreditCardBG: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_25,
  },
  LinearGradientStyle: {
    borderRadius: BORDERRADIUS.radius_25,
    gap: SPACING.space_36,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_10,
  },
  CreditCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  CreditCardNumberContainer: {
    flexDirection: 'row',
    gap: SPACING.space_10,
    alignItems: 'center',
  },
  CreditCardNumber: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    letterSpacing: SPACING.space_4 + SPACING.space_2,
  },
  CreditCardNameContainer: {
    alignItems: 'flex-start',
  },
  CreditCardNameSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.secondaryLightGreyHex,
  },
  CreditCardNameTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
  },
  CreditCardDateContainer: {
    alignItems: 'flex-end',
  },
  PriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_8,
  },
  PriceText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.secondaryLightGreyHex,
  },
  TotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryDarkGreyHex,
    paddingTop: SPACING.space_12,
    marginTop: SPACING.space_8,
  },
  TotalText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  // Membership Styles
  MembershipContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_15,
    marginBottom: SPACING.space_15,
    borderWidth: 2,
  },
  MembershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_10,
  },
  MembershipInfo: {
    flex: 1,
  },
  MembershipTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    marginBottom: SPACING.space_4,
  },
  MembershipPoints: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  MembershipBadge: {
    paddingHorizontal: SPACING.space_10,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
  },
  MembershipBadgeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  MembershipBenefits: {
    marginTop: SPACING.space_10,
  },
  BenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  BenefitText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    marginLeft: SPACING.space_8,
  },

  // Best Discount Styles
  BestDiscountContainer: {
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_15,
    marginBottom: SPACING.space_15,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  BestDiscountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  BestDiscountTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  BestDiscountTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
  },
  BestDiscountAmount: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryGreenHex,
  },
  BestDiscountDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },

  // Discount Options Styles
  DiscountOptionsContainer: {
    gap: SPACING.space_15,
  },
  DiscountOption: {
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_15,
    borderWidth: 2,
  },
  DiscountOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_10,
  },
  DiscountOptionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  DiscountOptionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    marginLeft: SPACING.space_8,
  },
  DiscountOptionAmount: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  DiscountOptionDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    marginBottom: SPACING.space_10,
  },
  DiscountOptionError: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryRedHex,
  },

  // Apply Discount Button Styles
  ApplyDiscountButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_10,
    alignItems: 'center',
  },
  ApplyDiscountButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },

  // Applied Discount Styles
  AppliedDiscountContainer: {
    backgroundColor: COLORS.primaryGreenHex + '20',
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    marginTop: SPACING.space_10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_8,
  },
  AppliedDiscountText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreenHex,
  },
});

export default PaymentScreen;