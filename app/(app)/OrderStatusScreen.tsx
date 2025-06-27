import React, { useEffect, useState, useRef, ReactElement } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import QRCode from 'react-native-qrcode-svg';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import firestore from '@react-native-firebase/firestore';
import { db } from '../../src/firebase/firebase-config';

const { width } = Dimensions.get('window');

interface OrderData {
  id: string;
  orderStatus: string;
  orderType: string;
  tableNumber?: string;
  totalAmount: number;
  paymentMode: string;
  items: any[];
  createdAt: any;
  displayName: string;
  orderDate: string;
  paymentStatus: string;
  userId: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  baristaNotes?: string | {
    message: string;
    timestamp: Date;
  }[];
  loyaltyDetails?: {
    pointsEarned: number;
    pointsRedeemed: number;
    pointsBeforeOrder: number;
    pointsAfterOrder: number;
    amountDetails: {
      originalAmount: number;
      discountAmount: number;
      finalAmount: number;
    };
    discountApplied: {
      type: string;
      amount: number;
      description: string;
    };
  };
}

interface BaristaNote {
  message: string;
  timestamp: Date;
}

// Add TypeScript types for icon components
type IconName = 'back' | 'tick' | 'order' | 'coffee' | 'takeaway' | 'dine' | 'bell' | 'smile';

interface IconWrapperProps {
  name: IconName;
  size: number;
  color: string;
}

// Update icon mapping function with proper types
const getIconComponent = (iconName: IconName, size: number, color: string): ReactElement => {
  const iconMap: Record<IconName, ReactElement> = {
    'back': <Icon name="arrow-back" size={size} color={color} />,
    'tick': <Icon name="check" size={size} color={color} />,
    'order': <Icon name="receipt" size={size} color={color} />,
    'coffee': <FontAwesome name="coffee" size={size} color={color} />,
    'takeaway': <Icon name="takeout-dining" size={size} color={color} />,
    'dine': <Icon name="restaurant" size={size} color={color} />,
    'bell': <Icon name="notifications" size={size} color={color} />,
    'smile': <Icon name="sentiment-satisfied" size={size} color={color} />,
  };
  
  return iconMap[iconName] || <Icon name="help" size={size} color={color} />;
};

const IconWrapper = ({ name, size, color }: IconWrapperProps) => {
  return getIconComponent(name, size, color);
};

// Add type for customization
interface Customization {
  name: string;
  value: string;
}

// Update the customization mapping with proper types
const getCustomizationText = (custom: Customization, idx: number) => {
  const customMap: Record<string, string> = {
    'milk': 'Milk',
    'sugar': 'Sugar',
    'ice': 'Ice',
    'size': 'Size',
    'temperature': 'Temperature',
    'toppings': 'Toppings',
    'syrup': 'Syrup',
    'espresso': 'Espresso Shots',
    'foam': 'Foam',
    'whip': 'Whipped Cream',
    'drizzle': 'Drizzle',
    'spice': 'Spice Level',
    'sweetness': 'Sweetness Level',
    'strength': 'Coffee Strength',
    'blend': 'Coffee Blend',
    'roast': 'Roast Level',
    'grind': 'Grind Size',
    'water': 'Water Ratio',
    'steam': 'Steam Level',
    'foam_density': 'Foam Density',
    'milk_temp': 'Milk Temperature',
    'milk_type': 'Milk Type',
    'milk_ratio': 'Milk Ratio',
    'sugar_type': 'Sugar Type',
    'sugar_amount': 'Sugar Amount',
    'ice_amount': 'Ice Amount',
    'ice_type': 'Ice Type',
    'topping_amount': 'Topping Amount',
    'syrup_amount': 'Syrup Amount',
    'syrup_type': 'Syrup Type',
    'espresso_amount': 'Espresso Amount',
    'foam_amount': 'Foam Amount',
    'whip_amount': 'Whipped Cream Amount',
    'drizzle_amount': 'Drizzle Amount',
    'drizzle_type': 'Drizzle Type',
    'spice_amount': 'Spice Amount',
    'sweetness_amount': 'Sweetness Amount',
    'strength_amount': 'Strength Amount',
    'blend_type': 'Blend Type',
    'roast_level': 'Roast Level',
    'grind_size': 'Grind Size',
    'water_ratio': 'Water Ratio',
    'steam_level': 'Steam Level',
    'foam_density_level': 'Foam Density Level',
    'milk_temp_level': 'Milk Temperature Level',
  };

  return customMap[custom.name] || custom.name;
};

const OrderStatusScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(4);
  const [baristaNotes, setBaristaNotes] = useState<BaristaNote[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [isRewardUnlocked, setIsRewardUnlocked] = useState(false);
  
  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const brewAnimationRef = useRef<LottieView>(null);
  const steamAnimationRef = useRef<LottieView>(null);
  const confettiAnimationRef = useRef<LottieView>(null);

  const getFirstParam = (param: string | string[]) => Array.isArray(param) ? param[0] : param;

  const orderId = params.orderId as string;
  const totalStr = getFirstParam(params.totalAmount);
  const total = totalStr ? parseFloat(totalStr).toFixed(2) : '0.00';
  const paymentMode = params.paymentMode as string;
  const orderType = params.orderType as string;
  const tableNumber = params.tableNumber as string;

  const getOrderStatuses = () => {
    if (orderType === 'dinein') {
      return [
        { id: 1, label: 'Order Placed', description:  `Table${tableNumber}`, icon: 'order' as IconName, color: '#FF6B35' },
        { id: 2, label: 'Received', description: 'Order received by kitchen', icon: 'tick' as IconName, color: '#4ECDC4' },
        { id: 3, label: 'Preparing', description: 'Chef is preparing your order', icon: 'dine' as IconName, color: '#45B7D1' },
        { id: 4, label: 'Ready', description: 'Order is ready to be served', icon: 'bell' as IconName, color: '#F7DC6F' },
        { id: 5, label: 'Served', description: 'Thank you for dining with us! Enjoy your meal! 🎉', icon: 'smile' as IconName, color: '#58D68D' }
      ];
    } else {
      return [
        { id: 1, label: 'Order Placed', description: 'Order confirmed', icon: 'order' as IconName, color: '#FF6B35' },
        { id: 2, label: 'Received', description: 'Barista received order', icon: 'tick' as IconName, color: '#4ECDC4' },
        { id: 3, label: 'Preparing', description: 'Brewing your coffee', icon: 'coffee' as IconName, color: '#45B7D1' },
        { id: 4, label: 'Ready', description: 'Ready for pickup', icon: 'takeaway' as IconName, color: '#F7DC6F' },
        { id: 5, label: 'Collected', description: 'Thank you for your order! We hope you enjoy! 🎉', icon: 'tick' as IconName, color: '#58D68D' },
      ];
    }
  };

  // FIXED: Updated status mapping to handle different order types and case variations
  const getStatusIndex = (status: string): number => {
    // Normalize status to handle case variations
    const normalizedStatus = status?.toLowerCase().trim();
    
    const dineInStatusMap: { [key: string]: number } = {
      'order placed': 0,
      'received': 1,
      'preparing': 2,
      'ready': 3,
      'served': 4
    };
    
    const takeawayStatusMap: { [key: string]: number } = {
      'order placed': 0,
      'confirmed': 1,
      'received': 1, // Handle both 'received' and 'confirmed' for takeaway
      'preparing': 2,
      'ready': 3,
      'collected': 4
    };
    
    const statusMap = orderType === 'dinein' ? dineInStatusMap : takeawayStatusMap;
    const index = statusMap[normalizedStatus];
    
    console.log('Order Type:', orderType);
    console.log('Current Status:', status);
    console.log('Normalized Status:', normalizedStatus);
    console.log('Mapped Index:', index);
    
    return index !== undefined ? index : 0;
  };

  const orderStatuses = getOrderStatuses();

  // Pulse animation for active status
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // FIXED: Progress bar animation with proper calculation
  const animateProgress = (toIndex: number) => {
    console.log('Animating progress to index:', toIndex);
    const totalSteps = orderStatuses.length - 1;
    const progressPercentage = totalSteps > 0 ? (toIndex / totalSteps) * 100 : 0;
    console.log('Calculated progress percentage:', progressPercentage);
    
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 800, // Slightly faster animation
      useNativeDriver: false,
    }).start(() => {
      console.log('Progress animation completed');
    });
  };

  // Initial slide in animation
  const slideInAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    slideInAnimation();
    startPulseAnimation();
  }, []);

  // FIXED: Combined Firebase listener with proper status updates
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    console.log('Setting up real-time listener for order:', orderId);
    
    const orderRef = db.collection('orders').doc(orderId);
    const unsubscribe = orderRef.onSnapshot((doc) => {
      if (doc.exists()) {
        const orderData = { id: doc.id, ...doc.data() } as OrderData;
        console.log('Real-time order update received:', orderData);
        
        // Update order details immediately
        setOrderDetails(orderData);
        
        // Handle barista notes - convert string to array if needed
        if (orderData.baristaNotes) {
          if (typeof orderData.baristaNotes === 'string') {
            // If it's a single note as string, convert to array format
            setBaristaNotes([{
              message: orderData.baristaNotes,
              timestamp: new Date()
            }]);
          } else if (Array.isArray(orderData.baristaNotes)) {
            // If it's already an array, process normally
            setBaristaNotes(orderData.baristaNotes.map((note: any) => ({
              message: note.message || '',
              timestamp: note.timestamp instanceof Date ? note.timestamp : new Date(note.timestamp)
            })));
          }
        } else {
          setBaristaNotes([]);
        }
        
        // Update loyalty points from loyaltyDetails
        if (orderData.loyaltyDetails) {
          const { pointsEarned = 0, pointsRedeemed = 0 } = orderData.loyaltyDetails;
          setLoyaltyPoints(pointsEarned - pointsRedeemed);
        } else {
          // Fallback to direct points if loyaltyDetails is not available
          const pointsEarned = orderData.pointsEarned || 0;
          const pointsRedeemed = orderData.pointsRedeemed || 0;
          setLoyaltyPoints(pointsEarned - pointsRedeemed);
        }
        
        if (orderData.orderStatus) {
          const newStatusIndex = getStatusIndex(orderData.orderStatus);
          console.log('New status detected:', {
            status: orderData.orderStatus,
            index: newStatusIndex
          });
          
          // Update status index and animate progress
          setCurrentStatusIndex(newStatusIndex);
          animateProgress(newStatusIndex);
        }
      } else {
        console.log('Order document not found');
        setBaristaNotes([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setLoading(false);
      setBaristaNotes([]);
    });

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up real-time listener');
      unsubscribe();
    };
  }, [orderId, orderType]);

  // Add a debug effect to monitor status changes
  useEffect(() => {
    console.log('Status Update:', {
      currentIndex: currentStatusIndex,
      orderStatus: orderDetails?.orderStatus,
      orderType: orderType
    });
  }, [currentStatusIndex, orderDetails?.orderStatus, orderType]);

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEstimatedTime = () => {
    const baseTime = orderType === 'dinein' ? 25 : 15;
    const additionalTime = currentStatusIndex * 5;
    return Math.max(baseTime - additionalTime, 5);
  };

  const renderOrderProgress = () => (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>Order Progress</Text>
      <View style={styles.progressSteps}>
        {orderStatuses.map((status, index) => {
          const isCompleted = index < currentStatusIndex;
          const isActive = index === currentStatusIndex;
          
          return (
            <View key={status.id} style={styles.progressStep}>
              <View style={[
                styles.stepIcon,
                isCompleted && styles.stepCompleted,
                isActive && styles.stepActive
              ]}>
                {isActive && status.label === 'Preparing' && (
                  <LottieView
                    ref={brewAnimationRef}
                    source={require('../../src/assets/animations/brewing.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                  />
                )}
                {isActive && status.label === 'Ready' && (
                  <LottieView
                    ref={steamAnimationRef}
                    source={require('../../src/assets/animations/brewing.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                  />
                )}
                <IconWrapper
                  name={status.icon as IconName}
                  size={24}
                  color={isCompleted ? COLORS.primaryWhiteHex : COLORS.primaryGreyHex}
                />
              </View>
              <Text style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelCompleted,
                isActive && styles.stepLabelActive
              ]}>
                {status.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // const renderCountdownTimer = () => (
  //   <View style={styles.timerSection}>
  //     <CountdownCircleTimer
  //       isPlaying
  //       duration={estimatedTime * 60}
  //       colors={['#FF6B35', '#F7931E']}
  //       colorsTime={[estimatedTime * 30, estimatedTime * 30]}
  //       size={120}
  //       strokeWidth={8}
  //     >
  //       {({ remainingTime }) => (
  //         <View style={styles.timerContent}>
  //           <Text style={styles.timerText}>
  //             {Math.ceil(remainingTime / 60)}
  //           </Text>
  //           <Text style={styles.timerLabel}>minutes</Text>
  //         </View>
  //       )}
  //     </CountdownCircleTimer>
  //   </View>
  // );

  const renderQRCode = () => (
    <View style={styles.qrSection}>
      <Text style={styles.sectionTitle}>Pickup QR Code</Text>
      <TouchableOpacity 
        style={styles.qrContainer}
        onPress={() => setShowQRCode(!showQRCode)}
      >
        <QRCode
        value={`order-${orderId}`}
          size={200}
          backgroundColor={COLORS.primaryWhiteHex}
          color={COLORS.primaryBlackHex}
        />
        <Text style={styles.qrInstructions}>
          Show this code at the counter
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBaristaNotes = () => {
    if (!baristaNotes || baristaNotes.length === 0) {
      return (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Barista Notes</Text>
          <View style={styles.emptyNotesContainer}>
            <Text style={styles.emptyNotesText}>No notes from barista yet</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Barista Notes</Text>
        {baristaNotes.map((note, index) => (
          <View key={index} style={styles.noteBubble}>
            <Text style={styles.noteText}>{note.message}</Text>
            <Text style={styles.noteTime}>
              {note.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderOrderSummary = () => (
    <View style={styles.summarySection}>
      <Text style={styles.sectionTitle}>Order Details</Text>
      {orderDetails?.items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
          </View>
          
          {item.size && (
            <Text style={styles.itemDetail}>Size: {item.size}</Text>
          )}
          
          {item.customizations && item.customizations.length > 0 && (
            <View style={styles.customizationsList}>
              {item.customizations.map((custom: Customization, idx: number) => (
                <Text key={idx} style={styles.customizationItem}>• {getCustomizationText(custom, idx)}</Text>
              ))}
            </View>
          )}
          
          <View style={styles.itemPrice}>
            <Text style={styles.priceText}>
              ₹{(item.price * item.quantity).toFixed(2)}
            </Text>
            {item.quantity > 1 && (
              <Text style={styles.unitPrice}>
                (₹{item.price.toFixed(2)} each)
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderLoyaltySection = () => {
    if (!orderDetails) return null;

    // Get points from route params first, then fallback to order details
    const pointsEarned = Number(params?.pointsEarned) || Number(orderDetails.loyaltyDetails?.pointsEarned) || Number(orderDetails.pointsEarned) || 0;
    const pointsRedeemed = Number(params?.pointsRedeemed) || Number(orderDetails.loyaltyDetails?.pointsRedeemed) || Number(orderDetails.pointsRedeemed) || 0;
    const netPoints = pointsEarned - pointsRedeemed;
    const pointsBeforeOrder = Number(orderDetails.loyaltyDetails?.pointsBeforeOrder) || 0;
    const pointsAfterOrder = Number(orderDetails.loyaltyDetails?.pointsAfterOrder) || 0;

    return (
      <View style={styles.loyaltySection}>
        <Text style={styles.sectionTitle}>Loyalty Points</Text>
        <View style={styles.loyaltyCard}>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{netPoints}</Text>
            <Text style={styles.pointsLabel}>Net Points</Text>
          </View>
          {pointsEarned > 0 && (
            <Text style={[styles.rewardText, { color: COLORS.primaryGreenHex }]}>
              +{pointsEarned} points earned
            </Text>
          )}
          {pointsRedeemed > 0 && (
            <Text style={[styles.rewardText, { color: COLORS.primaryRedHex }]}>
              -{pointsRedeemed} points redeemed
            </Text>
          )}
          <Text style={[styles.rewardText, { marginTop: SPACING.space_8 }]}>
            {netPoints > 0 ? "Keep earning points for rewards!" : "Thanks for using your points!"}
          </Text>
          {(pointsBeforeOrder > 0 || pointsAfterOrder > 0) && (
            <View style={styles.pointsHistory}>
              <Text style={styles.pointsHistoryText}>
                Points before order: {pointsBeforeOrder}
              </Text>
              <Text style={styles.pointsHistoryText}>
                Points after order: {pointsAfterOrder}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ADDED: Loading state handling
  if (loading) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Update the header section to use MaterialIcons instead of app_icons
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        onPress={() => router.push('/Home')}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
      </TouchableOpacity>
      <Text style={styles.headerText}>Order Status</Text>
      <Text style={styles.timeText}>{formatTime()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar backgroundColor="#F5F5DC" barStyle="dark-content" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {renderHeader()}
        {renderOrderProgress()}
        {renderQRCode()}
        {renderBaristaNotes()}
        {renderOrderSummary()}
        {renderLoyaltySection()}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/HomeScreen')}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={['#FF6B35', '#F7931E']}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/OrderScreen')}
          >
            <Text style={styles.secondaryButtonText}>View Order History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SPACING.space_36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  headerContainer: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5DC',
  },
  headerText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  timeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  progressSection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_16,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E8D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  stepCompleted: {
    backgroundColor: COLORS.primaryGreenHex,
  },
  stepActive: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  stepLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: COLORS.primaryGreenHex,
  },
  stepLabelActive: {
    color: COLORS.primaryOrangeHex,
  },
  animation: {
    width: 48,
    height: 48,
    position: 'absolute',
  },
  timerSection: {
    alignItems: 'center',
    marginVertical: SPACING.space_24,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
  },
  timerLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  qrSection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
    alignItems: 'center',
  },
  qrContainer: {
    padding: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrInstructions: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_12,
    textAlign: 'center',
  },
  notesSection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
  },
  noteBubble: {
    backgroundColor: '#F5F5DC',
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_12,
  },
  noteText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  noteTime: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_4,
  },
  summarySection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
  },
  itemCard: {
    backgroundColor: '#F5F5DC',
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  itemName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  itemQuantity: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  itemDetail: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_4,
  },
  customizationsList: {
    marginTop: SPACING.space_8,
  },
  customizationItem: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_2,
  },
  itemPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
  priceText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  unitPrice: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
  },
  loyaltySection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
  },
  loyaltyCard: {
    backgroundColor: '#F5F5DC',
    padding: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  pointsText: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryOrangeHex,
  },
  pointsLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  rewardText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
  },
  confettiAnimation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    paddingHorizontal: SPACING.space_24,
    gap: SPACING.space_16,
  },
  primaryButton: {
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: SPACING.space_18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  secondaryButton: {
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: BORDERRADIUS.radius_20,
    paddingVertical: SPACING.space_18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  secondaryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  emptyNotesContainer: {
    padding: SPACING.space_16,
    backgroundColor: '#F5F5DC',
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  emptyNotesText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    fontStyle: 'italic',
  },
  backButton: {
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_8,
  },
  pointsHistory: {
    marginTop: SPACING.space_16,
    padding: SPACING.space_12,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    width: '100%',
  },
  pointsHistoryText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_4,
  },
});

export default OrderStatusScreen;