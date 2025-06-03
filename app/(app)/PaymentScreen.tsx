import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import type { OrderData } from '../../src/types/interfaces';
import { auth } from '../../src/firebase/config';

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
    removeFromCart
  } = useStore();

  const [paymentMode, setPaymentMode] = useState('Credit Card');
  const [showAnimation, setShowAnimation] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  const PaymentList = [
    { name: 'PayPal', icon: 'paypal', isIcon: true },
    { name: 'Google Pay', icon: 'google', isIcon: true },
    { name: 'Apple Pay', icon: 'apple', isIcon: true },
    { name: 'Cash', icon: 'cash', isIcon: false },
  ];

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
console.log("Amount from params:", amount);
  // Add items to store if needed
  useEffect(() => {
    const syncItemsToStore = async () => {
      try {
        // Only sync if CartList is empty but we have items in params
        if ((!CartList || CartList.length === 0) && items && items.length > 0) {
          console.log("Syncing items from params to store:", items);
          
          // If your store has a function to add items in bulk, you could use that here
          // For example: addItemsToCart(items);
          
          // Or if you need to add them one by one:
          // items.forEach(item => addToCart(item));
          
          // If you want to make items available for OrderHistoryScreen
          // You might want to store them in AsyncStorage
          // This is especially useful if items aren't being maintained in your store between screens
        }
      } catch (error) {
        console.error("Error syncing items to store:", error);
      }
    };
    
    syncItemsToStore();
  }, []);

  // Clear cart function - FIXED
  const clearCart = () => {
    // Log the cart items before clearing
    console.log("Clearing cart with items:", CartList);
    
    // Clear each item in cart one by one
    if (CartList && CartList.length > 0) {
      // Create a copy to avoid issues during iteration
      const cartItems = [...CartList];
      cartItems.forEach(item => {
        console.log("Removing item from cart:", item);
        // Pass the entire item object, not just the ID
        removeFromCart(item);
      });
    }
    
    // Recalculate cart price
    calculateCartPrice();
    
    // Log cart status after clearing
    console.log("Cart after clearing:", CartList);
  };

  const buttonPressHandler = async () => {
    setShowAnimation(true);

    console.log("Button pressed, performing payment with CartList:", CartList);

    // Use items from params since CartList appears to be empty
    const orderData: OrderData = {
      userId,
      displayName,
      items,
      totalAmount: amount,
      orderType,
      orderStatus: "Order Placed" ,
      tableNumber: tableNumber || '', // Store the tableNumber as-is or empty string if null
      paymentMode,
      paymentStatus: 'Paid',
      orderDate: new Date().toISOString(),
      createdAt: new Date(),
    };

    try {
      // Save order and get ID
      const newOrderId = await saveOrderToFirestore(orderData);
      setOrderId(newOrderId);
      
      // Try clearing the cart - even if it appears to be empty
      clearCart();
      
      // Show success animation
      setTimeout(() => {
        setShowAnimation(false);
        // Navigate to order status page instead of history
        router.push({
          pathname: '/OrderStatusScreen',
          params: { 
            orderId: newOrderId,
            orderStatus: "Order Placed",
            total: amount,
            paymentMode,
            orderType,
            tableNumber: tableNumber || '' // Ensure tableNumber is passed correctly
          }
        });
      }, 1500);
    } catch (error) {
      setShowAnimation(false);
      Alert.alert('Payment Failed', 'Failed to save order details. Please try again.');
      console.error('Order save error:', error);
    }
  };

  return (
    <View style={styles.ScreenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />

      {showAnimation && (
        <PopUpAnimation
          style={styles.LottieAnimation}
          source={require('../../src/lottie/successful.json')}
          // Fix for the icon warning:
          // The animation is looking for "checkmark-circle" icon which doesn't exist
          // You may need to update your animation file or add this icon to your app_icons
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ScrollViewFlex}>
        <View style={styles.HeaderContainer}>
          <TouchableOpacity onPress={() => router.back()}>
            <GradientBGIcon
              name="left"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.HeaderText}>Payments</Text>
          <View style={styles.EmptyView} />
        </View>

        <View style={styles.PaymentOptionsContainer}>
          <TouchableOpacity onPress={() => setPaymentMode('Credit Card')}>
            <View
              style={[
                styles.CreditCardContainer,
                {
                  borderColor:
                    paymentMode === 'Credit Card'
                      ? COLORS.primaryOrangeHex
                      : COLORS.primaryGreyHex,
                },
              ]}>
              <Text style={styles.CreditCardTitle}>Credit Card</Text>
              <View style={styles.CreditCardBG}>
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.LinearGradientStyle}
                  colors={[COLORS.primaryGreyHex, COLORS.primaryBlackHex]}>
                  <View style={styles.CreditCardRow}>
                    <CustomIcon
                      name="chip"
                      size={FONTSIZE.size_20 * 2}
                      color={COLORS.primaryOrangeHex}
                    />
                    <CustomIcon
                      name="visa"
                      size={FONTSIZE.size_30 * 2}
                      color={COLORS.primaryWhiteHex}
                    />
                  </View>
                  <View style={styles.CreditCardNumberContainer}>
                    <Text style={styles.CreditCardNumber}>3879</Text>
                    <Text style={styles.CreditCardNumber}>8923</Text>
                    <Text style={styles.CreditCardNumber}>6745</Text>
                    <Text style={styles.CreditCardNumber}>4638</Text>
                  </View>
                  <View style={styles.CreditCardRow}>
                    <View style={styles.CreditCardNameContainer}>
                      <Text style={styles.CreditCardNameSubitle}>
                        Card Holder Name
                      </Text>
                      <Text style={styles.CreditCardNameTitle}>Robert Evans</Text>
                    </View>
                    <View style={styles.CreditCardDateContainer}>
                      <Text style={styles.CreditCardNameSubitle}>Expiry Date</Text>
                      <Text style={styles.CreditCardNameTitle}>02/30</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </TouchableOpacity>

          {PaymentList.map((data: any) => (
            <TouchableOpacity key={data.name} onPress={() => setPaymentMode(data.name)}>
              <PaymentMethod
                paymentMode={paymentMode}
                name={data.name}
                icon={data.icon}
                isIcon={data.isIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <PaymentFooter
        buttonTitle={`Pay with ${paymentMode}`}
        price={{ price: amount.toString(), currency: '$' }}
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
  PaymentOptionsContainer: {
    padding: SPACING.space_15,
    gap: SPACING.space_15,
  },
  CreditCardContainer: {
    padding: SPACING.space_10,
    gap: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_15 * 2,
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
  CreditCardNameSubitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.secondaryLightGreyHex,
  },
  CreditCardNameTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
  },
  CreditCardNameContainer: {
    alignItems: 'flex-start',
  },
  CreditCardDateContainer: {
    alignItems: 'flex-end',
  },
});

export default PaymentScreen;