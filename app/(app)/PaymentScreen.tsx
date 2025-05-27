import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import PaymentMethod from '../../src/components/PaymentMethod';
import type { PaymentMethodProps } from '../../src/components/PaymentMethod';
import PaymentFooter from '../../src/components/PaymentFooter';
import type { PaymentFooterProps } from '../../src/components/PaymentFooter';
import { LinearGradient } from 'expo-linear-gradient';
import CustomIcon from '../../src/components/CustomIcon';
import { useStore } from '../../src/store/store';
import PopUpAnimation from '../../src/components/PopUpAnimation';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PaymentService from '../../src/services/PaymentService';
import DatabaseService from '../../src/services/DatabaseService';

// Interfaces
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  roasted: string;
  special_ingredient: string;
  imagelink_square: string;
}

interface OrderData {
  userId: string;
  displayName: string;
  items: OrderItem[];
  totalAmount: number;
  orderType: string;
  tableNumber: string;
  paymentMode: string;
  paymentStatus: string;
  orderStatus: string;
  orderDate: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface PaymentResult {
  success: boolean;
  status: string;
  paymentId: string;
  amount?: number;
  data?: {
    merchantTransactionId?: string;
    redirectUrl?: string;
  };
  error?: string;
}

// Fallback for generating transaction IDs
const generateFallbackTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `txn_${timestamp}_${randomStr}`;
};

// PAYMENT CONFIGURATION
const PAYMENT_CONFIG = {
  MAX_POLLING_ATTEMPTS: 60,
  POLLING_INTERVAL: 3000,
  ANIMATION_DURATION: 2000,
  PAYMENT_TIMEOUT: 300000, // 5 minutes
};

// PAYMENT STATUS ENUM
const PAYMENT_STATUS = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  TIMEOUT: 'TIMEOUT',
};

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentOrderIdRef = useRef<string | null>(null); // Track current orderId

  // ENHANCED PARAMETER PARSING
  const parseParam = useCallback((param: string | string[] | undefined, defaultValue: string = ''): string => {
    if (!param) return defaultValue;
    const value = Array.isArray(param) ? param[0] : param;
    return value || defaultValue;
  }, []);

  // PARSED PARAMETERS WITH VALIDATION
  const amount = useMemo(() => {
    const amountStr = parseParam(params.total, '0');
    const parsedAmount = Number(amountStr);
    return isNaN(parsedAmount) || parsedAmount <= 0 ? 0 : parsedAmount;
  }, [params.total, parseParam]);

  const items = useMemo((): OrderItem[] => {
    try {
      const itemsStr = parseParam(params.items);
      if (!itemsStr) return [];
      const parsedItems = JSON.parse(itemsStr);
      return Array.isArray(parsedItems) ? parsedItems : [];
    } catch (error) {
      console.warn('Failed to parse items from params:', error);
      return [];
    }
  }, [params.items, parseParam]);

  const userId = parseParam(params.userId);
  const displayName = parseParam(params.displayName);
  const orderType = parseParam(params.orderType);
  const tableNumber = parseParam(params.tableNumber);

  // STORE INTEGRATION
  const { calculateCartPrice, CartList, removeFromCart, addToCart } = useStore();

  // COMPONENT STATE
  const [paymentMode, setPaymentMode] = useState<string>('PhonePe');
  const [paymentStatus, setPaymentStatus] = useState<string>(PAYMENT_STATUS.IDLE);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [merchantTransactionId, setMerchantTransactionId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<{
    number: string;
    expiry: string;
    cvv: string;
    holderName: string;
  }>({
    number: '',
    expiry: '',
    cvv: '',
    holderName: '',
  });
  const [pollCount, setPollCount] = useState<number>(0);

  const PaymentList: Array<{ name: string; icon: string; isIcon: boolean }> = [
    { name: 'PhonePe', icon: 'phonepe', isIcon: true },
    { name: 'Google Pay', icon: 'google', isIcon: true },
    { name: 'Credit Card', icon: 'credit-card', isIcon: true },
    { name: 'Cash', icon: 'cash', isIcon: false },
  ];

  // VALIDATION
  useEffect(() => {
    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'Payment amount must be greater than zero.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    if (!userId || !displayName) {
      Alert.alert('Missing Information', 'User information is required for payment.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    if (!items || items.length === 0) {
      Alert.alert('No Items', 'No items found for payment.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
  }, [amount, userId, displayName, items]);

  // CART SYNCHRONIZATION
  useEffect(() => {
    const syncItemsToStore = () => {
      try {
        if (!CartList?.length && items?.length) {
          console.log('Syncing items from params to store:', items.length);
          items.forEach(item => {
            if (item?.id) {
              addToCart(item);
            }
          });
          calculateCartPrice();
        }
      } catch (error) {
        console.error('Error syncing items to store:', error);
      }
    };

    syncItemsToStore();
  }, []);

  // CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
    };
  }, []);

  // CLEAR CART FUNCTION
  const clearCart = useCallback(() => {
    console.log('Clearing cart with items:', CartList?.length || 0);
    if (CartList?.length) {
      CartList.forEach(item => removeFromCart(item));
    }
    calculateCartPrice();
  }, [CartList, removeFromCart, calculateCartPrice]);

  // RETRY MECHANISM
  const retryOperation = useCallback(
    async (operation: () => Promise<void>, maxAttempts: number = 3, delay: number = 1000): Promise<void> => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          console.warn(`Attempt ${attempt} failed, retrying after ${delay * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    },
    [],
  );

  // ERROR HANDLER
  const handleError = useCallback((error: unknown, context: string = 'Payment') => {
    console.error(`${context} Error:`, error);
    setPaymentStatus(PAYMENT_STATUS.FAILED);
    setShowAnimation(false);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const userMessage = errorMessage.includes('crypto.getRandomValues')
      ? 'Payment failed due to a technical issue. Please try again or contact support.'
      : errorMessage;

    Alert.alert(
      `${context} Failed`,
      userMessage,
      [
        {
          text: 'Contact Support',
          onPress: () =>
            Linking.openURL(
              `mailto:support@example.com?subject=${context} Issue&body=Error: ${errorMessage}`,
            ),
        },
        { text: 'OK', onPress: () => console.log('Error acknowledged') },
      ],
    );
  }, []);

  // HANDLE PAYMENT SUCCESS
  const handlePaymentSuccess = useCallback(
    async (paymentResult: PaymentResult, orderId: string, orderAmount: number) => {
      try {
        console.log('🔍 Current orderId:', orderId);
        if (!orderId) {
          throw new Error('Order ID not found');
        }

        if (currentOrderIdRef.current !== orderId) {
          console.warn('Ignoring stale payment result for order:', orderId);
          return;
        }

        console.log('🎉 Processing successful payment:', paymentResult);
        setPaymentStatus(PAYMENT_STATUS.SUCCESS);

        // Validate payment result
        const requiredFields = ['paymentId', 'status'];
        const missingFields = requiredFields.filter(field => !paymentResult[field]);
        if (missingFields.length) {
          throw new Error(`Missing required payment result fields: ${missingFields.join(', ')}`);
        }

        // Use orderAmount if paymentResult.amount is missing
        const finalAmount = paymentResult.amount ?? orderAmount;

        // Retry database update
        await retryOperation(() =>
          DatabaseService.recordSuccessfulPayment(orderId, { ...paymentResult, amount: finalAmount }, {
            merchantTransactionId: merchantTransactionId || '',
          }),
        );

        clearCart();
        setShowAnimation(true);

        setTimeout(() => {
          setShowAnimation(false);
          try {
            router.push({
              pathname: '/OrderStatusScreen',
              params: {
                orderId,
                total: finalAmount.toString(),
                paymentMode,
                orderType,
                tableNumber: tableNumber || '',
                paymentId: paymentResult.paymentId,
                paymentStatus: 'SUCCESS',
              },
            });
          } catch (navError) {
            console.error('Navigation error:', navError);
            Alert.alert('Error', 'Failed to navigate to order status. Please try again.');
          }
        }, PAYMENT_CONFIG.ANIMATION_DURATION);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error('Error handling payment success:', {
          error: err.message,
          orderId,
          paymentResult,
          merchantTransactionId,
        });
        try {
          await AsyncStorage.setItem(`failed_payment_${orderId}`, JSON.stringify({
            orderId,
            paymentResult,
            merchantTransactionId,
            timestamp: new Date().toISOString(),
          }));
        } catch (storageError) {
          console.error('Failed to store payment details locally:', storageError);
        }
        Alert.alert(
          'Warning',
          `Payment successful (ID: ${paymentResult.paymentId || merchantTransactionId || 'Unknown'}). Failed to update records: ${err.message}. Please contact support with this ID.`,
          [
            {
              text: 'Contact Support',
              onPress: () =>
                Linking.openURL(
                  `mailto:support@example.com?subject=Payment Issue ${orderId}&body=Payment ID: ${
                    paymentResult.paymentId || merchantTransactionId || 'Unknown'
                  }`,
                ),
            },
            { text: 'OK', onPress: () => console.log('Warning acknowledged') },
          ],
        );
      }
    },
    [merchantTransactionId, clearCart, paymentMode, orderType, tableNumber, router, retryOperation],
  );

  // PAYMENT STATUS POLLING
  const startPaymentStatusPolling = useCallback(
    (merchantTxnId: string, orderId: string) => {
      if (!merchantTxnId) {
        handleError(new Error('No transaction ID provided'), 'Polling');
        return;
      }

      console.log('🔄 Starting payment status polling for:', merchantTxnId);
      setPaymentStatus(PAYMENT_STATUS.PENDING);
      setPollCount(0);
      currentOrderIdRef.current = orderId; // Set current orderId

      paymentTimeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPaymentStatus(PAYMENT_STATUS.TIMEOUT);
        handleError(
          new Error('Payment verification timeout. Please check your payment status manually.'),
          'Timeout',
        );
      }, PAYMENT_CONFIG.PAYMENT_TIMEOUT);

      pollIntervalRef.current = setInterval(async () => {
        try {
          setPollCount(prev => {
            const newCount = prev + 1;
            console.log(`📊 Polling attempt ${newCount}/${PAYMENT_CONFIG.MAX_POLLING_ATTEMPTS}`);
            if (newCount >= PAYMENT_CONFIG.MAX_POLLING_ATTEMPTS) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              if (paymentTimeoutRef.current) {
                clearTimeout(paymentTimeoutRef.current);
                paymentTimeoutRef.current = null;
              }
              setPaymentStatus(PAYMENT_STATUS.TIMEOUT);
              handleError(new Error('Payment verification timeout'), 'Polling');
              return newCount;
            }
            return newCount;
          });

          const statusResult = await PaymentService.checkPaymentStatus(merchantTxnId);
          console.log('📡 Polling result:', statusResult);
          if (statusResult.success && currentOrderIdRef.current === orderId) {
            const status = statusResult.status?.toUpperCase();
            if (status === 'SUCCESS' || status === 'COMPLETED') {
              console.log('✅ Payment successful!');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              if (paymentTimeoutRef.current) {
                clearTimeout(paymentTimeoutRef.current);
                paymentTimeoutRef.current = null;
              }
              await handlePaymentSuccess(statusResult, orderId, amount);
            } else if (status === 'FAILED' || status === 'CANCELLED') {
              console.log('❌ Payment failed/cancelled');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              if (paymentTimeoutRef.current) {
                clearTimeout(paymentTimeoutRef.current);
                paymentTimeoutRef.current = null;
              }
              setPaymentStatus(PAYMENT_STATUS.FAILED);
              handleError(new Error(statusResult.error || 'Payment failed'), 'Payment');
            }
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, PAYMENT_CONFIG.POLLING_INTERVAL);
    },
    [handleError, handlePaymentSuccess, amount],
  );

  // HANDLE PAYMENT REDIRECT
  const handlePaymentRedirect = useCallback(
    async (redirectUrl: string, merchantTxnId: string, orderId: string) => {
      try {
        console.log('🔗 Opening payment app:', redirectUrl);
        if (!redirectUrl) {
          console.log('No redirect URL provided, starting status polling...');
          startPaymentStatusPolling(merchantTxnId, orderId);
          return;
        }

        const supported = await Linking.canOpenURL(redirectUrl);
        if (supported) {
          await Linking.openURL(redirectUrl);
          console.log('✅ Payment app opened');
          startPaymentStatusPolling(merchantTxnId, orderId);
        } else {
          console.log('Cannot open URL, starting status polling...');
          startPaymentStatusPolling(merchantTxnId, orderId);
        }
      } catch (error) {
        console.error('Error opening payment app:', error);
        startPaymentStatusPolling(merchantTxnId, orderId);
      }
    },
    [startPaymentStatusPolling],
  );

  // PROCESS PAYMENT
  const processPayment = useCallback(
    async (orderData: OrderData, newOrderId: string) => {
      try {
        setPaymentStatus(PAYMENT_STATUS.PROCESSING);

        const paymentData = {
          amount: orderData.totalAmount,
          currency: 'INR',
          description: `Coffee Shop Order - ${orderData.items.length} items`,
          orderId: newOrderId,
          invoiceId: `INV-${newOrderId}`,
          paymentMethod: orderData.paymentMode,
          paymentDetails: paymentMode === 'Credit Card' ? { ...cardDetails, cvv: '***' } : {},
          customerInfo: {
            userId: orderData.userId,
            displayName: orderData.displayName,
            orderType: orderData.orderType,
            tableNumber: orderData.tableNumber,
          },
        };

        console.log('🔄 Processing payment with data:', {
          ...paymentData,
          paymentDetails: paymentMode === 'Credit Card' ? { maskedCard: true } : paymentData.paymentDetails,
        });

        let paymentResult: PaymentResult;
        try {
          paymentResult = await PaymentService.processPaymentWithValidation(paymentData, __DEV__);
        } catch (error) {
          if (error instanceof Error && error.message.includes('crypto.getRandomValues')) {
            console.warn('crypto.getRandomValues not supported, using fallback transaction ID');
            paymentResult = await PaymentService.processPaymentWithValidation(
              { ...paymentData, merchantTransactionId: generateFallbackTransactionId() },
              __DEV__,
            );
          } else {
            throw error;
          }
        }

        if (paymentResult.success) {
          console.log('✅ Payment initiated:', paymentResult);
          const merchantTxnId = paymentResult.data?.merchantTransactionId || generateFallbackTransactionId();
          setMerchantTransactionId(merchantTxnId);

          const status = paymentResult.status?.toUpperCase();
          if (status === 'SUCCESS' || status === 'COMPLETED') {
            await handlePaymentSuccess(paymentResult, newOrderId, orderData.totalAmount);
          } else if (status === 'PENDING' && paymentResult.data?.redirectUrl) {
            await handlePaymentRedirect(paymentResult.data.redirectUrl, merchantTxnId, newOrderId);
          } else if (status === 'PENDING') {
            startPaymentStatusPolling(merchantTxnId, newOrderId);
          } else {
            throw new Error(`Unexpected payment status: ${status}`);
          }

          return { success: true, paymentId: paymentResult.paymentId };
        } else {
          throw new Error(paymentResult.error || 'Payment initiation failed');
        }
      } catch (error) {
        console.error('💥 Payment processing error:', error);
        setPaymentStatus(PAYMENT_STATUS.FAILED);
        throw error;
      }
    },
    [paymentMode, cardDetails, handlePaymentSuccess, handlePaymentRedirect, startPaymentStatusPolling],
  );

  // HANDLE CASH PAYMENT
  const handleCashPayment = useCallback(async () => {
    try {
      setShowAnimation(true);
      setPaymentStatus(PAYMENT_STATUS.PROCESSING);

      const orderData: OrderData = {
        userId,
        displayName,
        items,
        totalAmount: amount,
        orderType,
        tableNumber: tableNumber || '',
        paymentMode: 'Cash',
        paymentStatus: 'Pending',
        orderStatus: 'PENDING',
        orderDate: new Date().toISOString(),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const newOrderId = await DatabaseService.createOrder(orderData);
      console.log('📝 New Order ID created for cash payment:', newOrderId);
      setOrderId(newOrderId);
      clearCart();

      setPaymentStatus(PAYMENT_STATUS.SUCCESS);

      setTimeout(() => {
        setShowAnimation(false);
        try {
          router.push({
            pathname: '/OrderStatusScreen',
            params: {
              orderId: newOrderId,
              total: amount.toString(),
              paymentMode: 'Cash',
              orderType,
              tableNumber: tableNumber || '',
              paymentStatus: 'PENDING',
            },
          });
        } catch (navError) {
          console.error('Navigation error:', navError);
          Alert.alert('Error', 'Failed to navigate to order status. Please try again.');
        }
      }, PAYMENT_CONFIG.ANIMATION_DURATION);
    } catch (error) {
      setShowAnimation(false);
      setPaymentStatus(PAYMENT_STATUS.FAILED);
      handleError(error, 'Cash Order');
    }
  }, [userId, displayName, items, amount, orderType, tableNumber, clearCart, router, handleError]);

  // MAIN PAYMENT HANDLER
  const buttonPressHandler = useCallback(async () => {
    if (paymentStatus === PAYMENT_STATUS.PROCESSING || paymentStatus === PAYMENT_STATUS.PENDING) {
      Alert.alert('Payment in Progress', 'Please wait for the current payment to complete.');
      return;
    }

    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }

    if (paymentMode === 'Credit Card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv)) {
      setShowCardModal(true);
      return;
    }

    if (paymentMode === 'Cash') {
      await handleCashPayment();
      return;
    }

    console.log('🚀 Starting payment process with method:', paymentMode);

    const orderData: OrderData = {
      userId,
      displayName,
      items,
      totalAmount: amount,
      orderType,
      tableNumber: tableNumber || '',
      paymentMode,
      paymentStatus: 'Processing',
      orderStatus: 'PROCESSING',
      orderDate: new Date().toISOString(),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    let newOrderId: string;
    try {
      newOrderId = await DatabaseService.createOrder(orderData);
      console.log('📝 New Order ID created:', newOrderId);
      setOrderId(newOrderId);

      await processPayment(orderData, newOrderId);
    } catch (error) {
      console.error('💥 Payment button handler error:', error);
      if (newOrderId) {
        try {
          await retryOperation(() =>
            DatabaseService.recordFailedPayment(newOrderId, (error instanceof Error ? error.message : 'Unknown error'), 'CANCELLED'),
          );
          console.log('✅ Failed payment recorded');
        } catch (dbError) {
          console.error('Error recording payment failure:', dbError);
        }
      }
      handleError(error, 'Payment');
    }
  }, [paymentStatus, paymentMode, cardDetails, handleCashPayment, userId, displayName, items, amount, orderType, tableNumber, processPayment, handleError, retryOperation]);

  // CARD VALIDATION
  const validateCardDetails = useCallback(() => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.holderName) {
      Alert.alert('Missing Information', 'Please fill in all card details.');
      return false;
    }

    const cleanNumber = cardDetails.number.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      Alert.alert('Invalid Card', 'Please enter a valid card number.');
      return false;
    }

    if (cardDetails.cvv.length < 3 || cardDetails.cvv.length > 4) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV.');
      return false;
    }

    const [month, year] = cardDetails.expiry.split('/');
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).');
      return false;
    }

    return true;
  }, [cardDetails]);

  // HANDLE CARD SUBMISSION
  const handleCardSubmit = useCallback(() => {
    if (!validateCardDetails()) {
      return;
    }
    setShowCardModal(false);
    buttonPressHandler();
  }, [validateCardDetails, buttonPressHandler]);

  // CARD FORMATTING FUNCTIONS
  const formatCardNumber = useCallback((text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 23);
  }, []);

  const formatExpiry = useCallback((text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  }, []);

  // LOADING STATE COMPUTATION
  const isLoading = paymentStatus === PAYMENT_STATUS.PROCESSING || paymentStatus === PAYMENT_STATUS.PENDING;

  return (
    <View style={styles.ScreenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.ScrollViewFlex}>
        {/* Header */}
        <View style={styles.HeaderContainer}>
          <TouchableOpacity
            onPress={() => {
              if (isLoading) {
                Alert.alert('Payment in Progress', 'Cannot go back while payment is being processed.');
                return;
              }
              router.back();
            }}>
            <GradientBGIcon name="left" color={COLORS.primaryLightGreyHex} size={FONTSIZE.size_16} />
          </TouchableOpacity>
          <Text style={styles.HeaderText}>Payment</Text>
          <View style={styles.EmptyView} />
        </View>

        {/* Payment Methods */}
        <View style={styles.PaymentOptionsContainer}>
          <TouchableOpacity disabled={isLoading} onPress={() => setPaymentMode('Credit Card')}>
            <View
              style={[
                styles.CreditCardContainer,
                {
                  borderColor: paymentMode === 'Credit Card' ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}>
              <Text style={styles.CreditCardTitle}>Credit & Debit Card</Text>
              <View style={styles.CreditCardBG}>
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  colors={[COLORS.primaryGreyHex, COLORS.primaryBlackHex]}
                  style={styles.LinearGradientStyle}>
                  <View style={styles.CreditCardRow}>
                    <CustomIcon name="chip" size={FONTSIZE.size_20} color={COLORS.primaryOrangeHex} />
                    <CustomIcon name="visa" size={FONTSIZE.size_30} color={COLORS.primaryWhiteHex} />
                  </View>
                  <View style={styles.CreditCardNumberContainer}>
                    <Text style={styles.CreditCardNumber}>3879</Text>
                    <Text style={styles.CreditCardNumber}>8934</Text>
                    <Text style={styles.CreditCardNumber}>6745</Text>
                    <Text style={styles.CreditCardNumber}>4638</Text>
                  </View>
                  <View style={styles.CreditCardRow}>
                    <View style={styles.CreditCardNameContainer}>
                      <Text style={styles.CreditCardNameSubtitle}>Card Holder Name</Text>
                      <Text style={styles.CreditCardNameTitle}>Robert Evans</Text>
                    </View>
                    <View style={styles.CreditCardDateContainer}>
                      <Text style={styles.CreditCardNameSubtitle}>Expiry Date</Text>
                      <Text style={styles.CreditCardNameTitle}>02/30</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </TouchableOpacity>

          {PaymentList.map((data, index) => (
            <TouchableOpacity
              key={index.toString()}
              disabled={isLoading}
              onPress={() => setPaymentMode(data.name)}>
              <PaymentMethod
                paymentMode={paymentMode}
                name={data.name}
                icon={data.icon}
                isIcon={data.isIcon}
                disabled={isLoading}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Payment Footer */}
      <PaymentFooter
        buttonTitle={paymentStatus === PAYMENT_STATUS.PENDING ? 'Verifying Payment...' : `Pay with ${paymentMode}`}
        price={{ price: amount.toString(), currency: '₹' }}
        buttonPressHandler={buttonPressHandler}
        isLoading={isLoading}
      />

      {/* Credit Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCardModal}
        onRequestClose={() => !isLoading && setShowCardModal(false)}>
        <View style={styles.ModalOverlay}>
          <View style={styles.ModalContainer}>
            <Text style={styles.ModalTitle}>Enter Card Details</Text>
            <TextInput
              style={styles.ModalInput}
              placeholder="Card Number"
              placeholderTextColor={COLORS.primaryLightGreyHex}
              value={cardDetails.number}
              onChangeText={text => setCardDetails({ ...cardDetails, number: formatCardNumber(text) })}
              keyboardType="numeric"
              maxLength={23}
              editable={!isLoading}
            />
            <View style={styles.ModalRow}>
              <TextInput
                style={[styles.ModalInput, { flex: 1, marginRight: SPACING.space_8 }]}
                placeholder="MM/YY"
                placeholderTextColor={COLORS.primaryLightGreyHex}
                value={cardDetails.expiry}
                onChangeText={text => setCardDetails({ ...cardDetails, expiry: formatExpiry(text) })}
                keyboardType="numeric"
                maxLength={5}
                editable={!isLoading}
              />
              <TextInput
                style={[styles.ModalInput, { flex: 1, marginLeft: SPACING.space_8 }]}
                placeholder="CVV"
                placeholderTextColor={COLORS.primaryLightGreyHex}
                value={cardDetails.cvv}
                onChangeText={text =>
                  setCardDetails({ ...cardDetails, cvv: text.replace(/\D/g, '').substring(0, 4) })
                }
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
            <TextInput
              style={styles.ModalInput}
              placeholder="Cardholder Name"
              placeholderTextColor={COLORS.primaryLightGreyHex}
              value={cardDetails.holderName}
              onChangeText={text => setCardDetails({ ...cardDetails, holderName: text })}
              editable={!isLoading}
            />
            <View style={styles.ModalButtonContainer}>
              <TouchableOpacity
                style={[styles.ModalButton, styles.ModalCancelButton]}
                onPress={() => setShowCardModal(false)}
                disabled={isLoading}>
                <Text style={styles.ModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ModalButton, styles.ModalSubmitButton]}
                onPress={handleCardSubmit}
                disabled={isLoading}>
                <Text style={styles.ModalButtonText}>{isLoading ? 'Processing...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Animation */}
      {showAnimation && (
        <PopUpAnimation
          style={styles.LottieAnimation}
          source={require('../../src/lottie/successful.json')}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
          <Text style={styles.logText}>
            {paymentStatus === PAYMENT_STATUS.PROCESSING && 'Processing payment...'}
            {paymentStatus === PAYMENT_STATUS.PENDING &&
              `Verifying payment... (${pollCount}/${PAYMENT_CONFIG.MAX_POLLING_ATTEMPTS})`}
          </Text>
          {paymentStatus === PAYMENT_STATUS.PENDING && (
            <Text style={styles.logTextSub}>Complete payment in your app and return here</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ScreenContainer: { flex: 1, backgroundColor: COLORS.primaryBlackHex },
  ScrollViewFlex: { flexGrow: 1 },
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
  EmptyView: { height: SPACING.space_36, width: SPACING.space_36 },
  PaymentOptionsContainer: { padding: SPACING.space_15, gap: SPACING.space_15 },
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
  CreditCardBG: { backgroundColor: COLORS.primaryGreyHex, borderRadius: BORDERRADIUS.radius_25 },
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
  CreditCardNameContainer: { alignItems: 'flex-start' },
  CreditCardDateContainer: { alignItems: 'flex-end' },
  LottieAnimation: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_16,
  },
  logTextSub: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
  },
  ModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ModalContainer: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    margin: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_20,
    width: '90%',
  },
  ModalTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  ModalInput: {
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
    marginBottom: SPACING.space_15,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
  },
  ModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.space_20,
  },
  ModalButton: {
    flex: 1,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_10,
    alignItems: 'center',
  },
  ModalCancelButton: {
    backgroundColor: COLORS.primaryGreyHex,
    marginRight: SPACING.space_10,
  },
  ModalSubmitButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_10,
  },
  ModalButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});