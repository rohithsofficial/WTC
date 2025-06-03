import React, { useEffect, useState, useRef } from 'react';
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
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
}

// Icon mapping function
const getIconComponent = (iconName, size, color) => {
  const iconMap = {
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

const IconWrapper = ({ name, size, color }) => {
  return getIconComponent(name, size, color);
};

const OrderStatusScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  
  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        { 
          id: 1, 
          label: 'Order Placed', 
          description: `Table ${tableNumber}`,
          icon: 'order',
          color: '#FF6B35'
        },
        { 
          id: 2, 
          label: 'Received', 
          description: 'Order received by kitchen',
          icon: 'tick',
          color: '#4ECDC4'
        },
        { 
          id: 3, 
          label: 'Preparing', 
          description: 'Chef is preparing your order',
          icon: 'dine',
          color: '#45B7D1'
        },
        { 
          id: 4, 
          label: 'Ready', 
          description: 'Order is ready to be served',
          icon: 'bell',
          color: '#F7DC6F'
        },
        { 
          id: 5, 
          label: 'Served', 
          description: 'Thank you for dining with us! Enjoy your meal! 🎉',
          icon: 'smile',
          color: '#58D68D'
        }
      ];
    } else {
      return [
        { 
          id: 1, 
          label: 'Order Placed', 
          description: 'Order confirmed',
          icon: 'order',
          color: '#FF6B35'
        },
        { 
          id: 2, 
          label: 'Received', 
          description: 'Barista received order',
          icon: 'tick',
          color: '#4ECDC4'
        },
        { 
          id: 3, 
          label: 'Preparing', 
          description: 'Brewing your coffee',
          icon: 'coffee',
          color: '#45B7D1'
        },
        { 
          id: 4, 
          label: 'Ready', 
          description: 'Ready for pickup',
          icon: 'takeaway',
          color: '#F7DC6F'
        },
        { 
          id: 5, 
          label: 'Collected', 
          description: 'Thank you for your order! We hope you enjoy! 🎉',
          icon: 'tick',
          color: '#58D68D'
        }
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
    
    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const orderData = { id: doc.id, ...doc.data() } as OrderData;
        console.log('Real-time order update received:', orderData);
        
        // Update order details immediately
        setOrderDetails(orderData);
        
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
      }
      setLoading(false);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setLoading(false);
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

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar backgroundColor="#F5F5DC" barStyle="dark-content" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}>
        
        {/* Header */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity onPress={() => router.push('/Home')}>
            <GradientBGIcon
              name="back"
              color={COLORS.primaryBlackHex}
              size={FONTSIZE.size_18}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Order Status</Text>
          <Text style={styles.timeText}>{formatTime()}</Text>
        </Animated.View>
        
        {/* Success Hero Section */}
        <Animated.View 
          style={[
            styles.heroContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#FF6B35', '#F7931E']}
            style={styles.heroCircle}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <IconWrapper
                name="tick"
                size={60}
                color={COLORS.primaryWhiteHex}
              />
            </Animated.View>
          </LinearGradient>
          
          <Text style={styles.heroTitle}>Order Confirmed!</Text>
          <Text style={styles.heroSubtitle}>
            Estimated time: {getEstimatedTime()} minutes
          </Text>
          
          {/* Order Type Badge */}
          <View style={[
            styles.orderTypeBadge,
            { backgroundColor: orderType === 'dinein' ? '#4ECDC4' : '#45B7D1' }
          ]}>
            <IconWrapper
              name={orderType === 'dinein' ? 'dine' : 'takeaway'}
              size={16}
              color={COLORS.primaryWhiteHex}
            />
            <Text style={styles.orderTypeText}>
              {orderType === 'dinein' ? `Dine In - Table ${tableNumber}` : 'Takeaway'}
            </Text>
          </View>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View 
          style={[
            styles.progressContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }
              ]} 
            />
          </View>
        </Animated.View>
        
        {/* Status Timeline */}
        <Animated.View 
          style={[
            styles.timelineContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {orderStatuses.map((status, index) => {
            const isCompleted = index < currentStatusIndex;
            const isActive = index === currentStatusIndex;
            const isPending = index > currentStatusIndex;

            return (
              <View key={status.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View 
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isActive && [styles.timelineDotActive, { backgroundColor: status.color }],
                      isPending && styles.timelineDotPending,
                    ]}
                  >
                    {isCompleted ? (
                      <IconWrapper
                        name="tick"
                        size={12}
                        color={COLORS.primaryWhiteHex}
                      />
                    ) : (
                      <IconWrapper
                        name={status.icon}
                        size={isActive ? 16 : 12}
                        color={isActive ? COLORS.primaryWhiteHex : COLORS.primaryLightGreyHex}
                      />
                    )}
                  </View>
                  {index < orderStatuses.length - 1 && (
                    <View 
                      style={[
                        styles.timelineConnector,
                        isCompleted && styles.timelineConnectorCompleted
                      ]} 
                    />
                  )}
                </View>
                
                <View style={styles.timelineRight}>
                  <Text style={[
                    styles.timelineTitle,
                    isCompleted && styles.timelineTitleCompleted,
                    isActive && styles.timelineTitleActive,
                  ]}>
                    {status.label}
                  </Text>
                  <Text style={styles.timelineDescription}>
                    {status.description}
                  </Text>
                  {isActive && (
                    <View style={styles.activeIndicator}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.activeText}>
                        {orderDetails?.orderStatus === 'Order Placed' ? 'Waiting for Confirmation' : 'In Progress'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Order Summary Card */}
        <Animated.View 
          style={[
            styles.summaryCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={[COLORS.primaryGreyHex, COLORS.primaryBlackRGBA]}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <Text style={styles.orderNumber}>#{orderId?.substring(0, 8)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <View style={styles.paymentBadge}>
                <Text style={styles.summaryValue}>{paymentMode}</Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>
                ${orderDetails?.totalAmount ? orderDetails.totalAmount.toFixed(2) : total}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/HomeScreen')}>
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
            onPress={() => router.push('/OrderScreen')}>
            <Text style={styles.secondaryButtonText}>View Order History</Text>
          </TouchableOpacity>
        </Animated.View>
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
  heroContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space_36,
    paddingHorizontal: SPACING.space_24,
    backgroundColor: '#F5F5DC',
  },
  heroCircle: {
    height: 120,
    width: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_24,
    backgroundColor: COLORS.primaryBlackHex,
    shadowColor: COLORS.primaryOrangeHex,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  heroTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_28,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_25,
    gap: SPACING.space_8,
    backgroundColor: COLORS.primaryBlackHex,
  },
  orderTypeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  progressContainer: {
    paddingHorizontal: SPACING.space_36,
    marginBottom: SPACING.space_36,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8D0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: 3,
  },
  timelineContainer: {
    paddingHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_36,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.space_4,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: SPACING.space_20,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryOrangeHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primaryGreenHex,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primaryOrangeHex,
    transform: [{ scale: 1.1 }],
  },
  timelineDotPending: {
    backgroundColor: '#E8E8D0',
  },
  timelineConnector: {
    width: 2,
    height: 40,
    backgroundColor: '#E8E8D0',
    marginTop: SPACING.space_8,
  },
  timelineConnectorCompleted: {
    backgroundColor: COLORS.primaryGreenHex,
  },
  timelineRight: {
    flex: 1,
    paddingTop: SPACING.space_8,
  },
  timelineTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  timelineTitleCompleted: {
    color: COLORS.primaryGreenHex,
  },
  timelineTitleActive: {
    color: COLORS.primaryOrangeHex,
  },
  timelineDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    opacity: 0.8,
    marginBottom: SPACING.space_12,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrangeHex,
  },
  activeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
  },
  summaryCard: {
    marginHorizontal: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_20,
    marginBottom: SPACING.space_36,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryBlackHex,
  },
  summaryGradient: {
    padding: SPACING.space_24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  summaryTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
  },
  orderNumber: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E8E8D0',
    opacity: 0.2,
    marginBottom: SPACING.space_16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_12,
  },
  summaryLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  summaryValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  paymentBadge: {
    backgroundColor: COLORS.primaryGreyHex,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_10,
  },
  totalAmount: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryOrangeHex,
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
});

export default OrderStatusScreen;