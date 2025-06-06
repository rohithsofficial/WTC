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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import type { OrderData } from '../../src/types/interfaces';
import type { RedemptionCalculation } from '../../src/types/loyalty';
import { LOYALTY_CONFIG } from '../../src/types/loyalty';
import { auth } from '../../src/firebase/config';
import { LoyaltyService } from '../../src/services/loyaltyService';

const PaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

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

  const [paymentMode, setPaymentMode] = useState('Credit Card');
  const [showAnimation, setShowAnimation] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Loyalty points state
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [redemptionCalculation, setRedemptionCalculation] = useState<RedemptionCalculation>({
    pointsToRedeem: 0,
    discountAmount: 0,
    remainingAmount: 0,
    isValid: false
  });
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [isFestival, setIsFestival] = useState(false);
  const [orderAmount, setOrderAmount] = useState(amount);

  const PaymentList = [
    { name: 'Credit Card', icon: 'credit-card', isIcon: true },
    { name: 'PayPal', icon: 'paypal', isIcon: true },
    { name: 'Google Pay', icon: 'google', isIcon: true },
    { name: 'Apple Pay', icon: 'apple', isIcon: true },
    { name: 'Cash', icon: 'cash', isIcon: false },
  ];

  // Load user data and check conditions
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const profile = await LoyaltyService.getUserProfile(user.uid);
        if (profile) {
          setIsFirstOrder(profile.totalOrders === 0);
          
          // Check if it's user's birthday
          if (profile.birthday) {
            const today = new Date();
            const userBirthday = new Date(profile.birthday);
            setIsBirthday(
              today.getDate() === userBirthday.getDate() &&
              today.getMonth() === userBirthday.getMonth()
            );
          }

          // Check if it's a festival day
          setIsFestival(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Load loyalty points
  useEffect(() => {
    const loadLoyaltyPoints = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const points = await LoyaltyService.getUserLoyaltyPoints(user.uid);
        setAvailablePoints(points);
      } catch (error) {
        console.error('Error loading loyalty points:', error);
      } finally {
        setLoadingPoints(false);
      }
    };

    loadLoyaltyPoints();
  }, []);

  // Calculate redemption when points input changes
  useEffect(() => {
    const points = parseInt(pointsToRedeem) || 0;
    const calculation = LoyaltyService.calculateRedemption(
      points,
      availablePoints,
      amount
    );
    setRedemptionCalculation(calculation);
  }, [pointsToRedeem, availablePoints, amount]);

  // Handle points redemption
  const handlePointsRedeem = () => {
    if (!redemptionCalculation.isValid) {
      Alert.alert('Invalid Redemption', redemptionCalculation.errorMessage);
      return;
    }

    // Update order amount with discount
    setOrderAmount(redemptionCalculation.remainingAmount);
    setPointsToRedeem('');
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
        redemptionCalculation.remainingAmount,
        redemptionCalculation.pointsToRedeem,
        displayName || auth.currentUser.displayName || 'User'
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
  const clearCart = () => {
    try {
      // First remove all items from the cart list
      if (CartList && CartList.length > 0) {
        const itemsToRemove = [...CartList]; // Create a copy of the array
        itemsToRemove.forEach(item => {
          removeFromCart(item.id);
        });
      }
      
      // Then clear the cart state
      storeClearCart();
      
      // Finally recalculate cart price
      calculateCartPrice();
      
      console.log('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // Main payment processing function
  const buttonPressHandler = async () => {
    if (isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Validate redemption
      if (redemptionCalculation.pointsToRedeem > availablePoints) {
        Alert.alert('Error', 'Insufficient loyalty points');
        return;
      }

      // Create order data
      const orderData: OrderData = {
        userId: userId || auth.currentUser?.uid || 'guest',
        displayName: displayName || auth.currentUser?.displayName || 'Guest',
        items: items.length > 0 ? items : CartList,
        totalAmount: amount,
        discountAmount: redemptionCalculation.discountAmount,
        finalAmount: redemptionCalculation.remainingAmount,
        pointsRedeemed: redemptionCalculation.pointsToRedeem,
        pointsEarned: LoyaltyService.calculatePointsEarned(redemptionCalculation.remainingAmount),
        paymentMethod: paymentMode,
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

      // Clear the cart
      clearCart();

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

  const finalAmount = redemptionCalculation.remainingAmount;

  return (
    <View style={styles.ScreenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
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
        <View style={styles.HeaderContainer}>
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
        </View>

        {/* Loyalty Points Section */}
        <View style={styles.PaymentContainer}>
          <Text style={styles.PaymentHeaderText}>Loyalty Points</Text>
          
          {loadingPoints ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primaryOrangeHex} />
              <Text style={styles.loadingText}>Loading loyalty points...</Text>
            </View>
          ) : (
            <>
              <LoyaltyPointsDisplay
                availablePoints={availablePoints}
                nextMilestone={LoyaltyService.getNextRewardMilestone(availablePoints)}
              />
              
              {availablePoints >= LOYALTY_CONFIG.minRedemption && (
                <RedeemPointsInput
                  availablePoints={availablePoints}
                  orderAmount={amount}
                  onRedemptionChange={handlePointsRedeem}
                  disabled={isProcessingPayment}
                />
              )}

              {/* Show bonus multipliers if applicable */}
              {(isFirstOrder || isBirthday || isFestival) && (
                <View style={styles.bonusContainer}>
                  <Text style={styles.bonusTitle}>Active Bonuses:</Text>
                  {isFirstOrder && (
                    <Text style={styles.bonusText}>
                      🎉 First Order: {LOYALTY_CONFIG.firstOrderMultiplier}x points
                    </Text>
                  )}
                  {isBirthday && (
                    <Text style={styles.bonusText}>
                      🎂 Birthday Bonus: {LOYALTY_CONFIG.birthdayBonusPoints} points
                    </Text>
                  )}
                  {isFestival && (
                    <Text style={styles.bonusText}>
                      🎊 Festival Bonus: {LOYALTY_CONFIG.festivalMultiplier}x points
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.PaymentContainer}>
          <Text style={styles.PaymentHeaderText}>Payment Options</Text>
          
          <TouchableOpacity>
            <View style={[
              styles.CreditCardContainer,
              { borderColor: paymentMode === 'Credit Card' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex }
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

          {PaymentList.map((data, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setPaymentMode(data.name)}>
              <PaymentMethod
                paymentMode={paymentMode}
                name={data.name}
                icon={data.icon}
                isIcon={data.isIcon}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.PaymentContainer}>
          <Text style={styles.PaymentHeaderText}>Order Summary</Text>
          
          <View style={styles.PriceRow}>
            <Text style={styles.PriceText}>Subtotal</Text>
            <Text style={styles.PriceText}>₹ {amount.toFixed(2)}</Text>
          </View>

          {redemptionCalculation.discountAmount > 0 && (
            <View style={styles.PriceRow}>
              <Text style={[styles.PriceText, { color: COLORS.primaryOrangeHex }]}>
                Loyalty Discount ({redemptionCalculation.pointsToRedeem} points)
              </Text>
              <Text style={[styles.PriceText, { color: COLORS.primaryOrangeHex }]}>
                -₹ {redemptionCalculation.discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.PriceRow, styles.TotalRow]}>
            <Text style={styles.TotalText}>Total</Text>
            <Text style={styles.TotalText}>₹ {finalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <PaymentFooter
        buttonTitle={isProcessingPayment ? 'Processing...' : `Pay ₹ ${finalAmount.toFixed(2)}`}
        price={{ price: finalAmount.toString(), currency: '₹' }}
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
    flex: 1,
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
    marginBottom: SPACING.space_12,
  },
  CreditCardContainer: {
    padding: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_15,
    borderWidth: 3,
  },
  CreditCardTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_10,
  },
  CreditCardBG: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_25,
    margin: SPACING.space_10,
  },
  LinearGradientStyle: {
    borderRadius: BORDERRADIUS.radius_25,
    padding: SPACING.space_15,
    justifyContent: 'space-between',
    height: 180,
  },
  CreditCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  CreditCardNumberContainer: {
    flexDirection: 'row',
    gap: SPACING.space_10,
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
  CreditCardDateContainer: {
    alignItems: 'flex-end',
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
  PriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.space_4,
  },
  PriceText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.secondaryLightGreyHex,
  },
  TotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryDarkGreyHex,
    paddingTop: SPACING.space_8,
    marginTop: SPACING.space_8,
  },
  TotalText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  loadingContainer: {
    padding: SPACING.space_20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
  },
  bonusContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#2C3E50',
  },
  bonusText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 3,
  },
});

export default PaymentScreen;