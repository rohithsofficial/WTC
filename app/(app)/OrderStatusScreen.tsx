import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  Image,
  TouchableOpacity,
  ScrollView,
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { LinearGradient } from 'expo-linear-gradient';
import CustomIcon from '../../src/components/CustomIcon';

const OrderStatusScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get parameters from router
  const orderId = params.orderId as string;
  const total = params.total as string;
  const paymentMode = params.paymentMode as string;
  const orderType = params.orderType as string;
  const tableNumber = params.tableNumber as string;
  
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (orderDoc.exists()) {
          setOrderDetails({ id: orderDoc.id, ...orderDoc.data() });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order details:', error);
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);

  // Estimated delivery time (10-15 minutes from now)
  const estimatedDeliveryTime = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 15 * 60000); // 15 minutes from now
    return deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.push('/Home')}>
            <GradientBGIcon
              name="home"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Order Status</Text>
          <View style={styles.emptyView} />
        </View>
        
        {/* Success Animation/Image */}
        <View style={styles.successContainer}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={[COLORS.primaryGreyHex, COLORS.primaryBlackHex]}
            style={styles.successCircle}>
            <CustomIcon
              name="checkmark-circle"
              size={80}
              color={COLORS.primaryOrangeHex}
            />
          </LinearGradient>
          <Text style={styles.successTitle}>Order Successful!</Text>
          <Text style={styles.successDescription}>
            Your order has been placed successfully.
          </Text>
        </View>
        
        {/* Order Info Card */}
        <View style={styles.orderInfoCard}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Order Number</Text>
            <Text style={styles.orderInfoValue}>{orderId?.substring(0, 8)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Order Type</Text>
            <Text style={styles.orderInfoValue}>
              {orderType === 'table' ? `Table ${tableNumber}` : 'Takeaway'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Payment Method</Text>
            <Text style={styles.orderInfoValue}>{paymentMode}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Total Amount</Text>
            <Text style={styles.orderInfoValue}>${total}</Text>
          </View>
          
          {orderType !== 'table' && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Estimated Delivery</Text>
                <Text style={styles.orderInfoValue}>{estimatedDeliveryTime()}</Text>
              </View>
            </>
          )}
        </View>
        
        {/* Order Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>
            {orderType === 'table' ? 'Your order is being prepared' : 'Delivery Status'}
          </Text>
          
          <View style={styles.statusTracker}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, styles.statusCompleted]} />
              <Text style={styles.statusText}>Order Confirmed</Text>
            </View>
            
            <View style={[styles.statusConnector, styles.statusCompletedConnector]} />
            
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, styles.statusCompleted]} />
              <Text style={styles.statusText}>Processing</Text>
            </View>
            
            <View style={[styles.statusConnector, styles.statusCompletedConnector]} />
            
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, styles.statusActive]} />
              <Text style={styles.statusText}>
                {orderType === 'table' ? 'Preparing' : 'On the Way'}
              </Text>
            </View>
            
            <View style={styles.statusConnector} />
            
            <View style={styles.statusItem}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {orderType === 'table' ? 'Served' : 'Delivered'}
              </Text>
            </View>
          </View>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.push('/HomeScreen')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
        
        {/* View Order History Button */}
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => router.push('/OrderScreen')}>
          <Text style={styles.historyButtonText}>View Order History</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SPACING.space_28,
  },
  headerContainer: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
  },
  emptyView: {
    height: SPACING.space_36,
    width: SPACING.space_36,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space_30,
  },
  successCircle: {
    height: 120,
    width: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_20,
    padding: SPACING.space_15,
  },
  successTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  successDescription: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
  orderInfoCard: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    padding: SPACING.space_20,
    marginTop: SPACING.space_20,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_10,
  },
  orderInfoLabel: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  orderInfoValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.primaryBlackHex,
    opacity: 0.2,
  },
  statusContainer: {
    marginHorizontal: SPACING.space_24,
    marginTop: SPACING.space_30,
  },
  statusTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
  },
  statusTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.space_10,
  },
  statusItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '20%',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_8,
  },
  statusActive: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  statusCompleted: {
    backgroundColor: COLORS.secondaryGreenHex,
  },
  statusConnector: {
    height: 3,
    backgroundColor: COLORS.primaryGreyHex,
    flex: 1,
  },
  statusCompletedConnector: {
    backgroundColor: COLORS.secondaryGreenHex,
  },
  statusText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
  homeButton: {
    marginHorizontal: SPACING.space_24,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_20,
    paddingVertical: SPACING.space_15,
    alignItems: 'center',
    marginTop: SPACING.space_36,
  },
  homeButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  historyButton: {
    marginHorizontal: SPACING.space_24,
    backgroundColor: 'transparent',
    borderRadius: BORDERRADIUS.radius_20,
    paddingVertical: SPACING.space_15,
    alignItems: 'center',
    marginTop: SPACING.space_10,
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
  },
  historyButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryLightGreyHex,
  },
});

export default OrderStatusScreen;