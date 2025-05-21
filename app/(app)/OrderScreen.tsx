import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import CustomIcon from '../../src/components/CustomIcon';
import { MaterialIcons } from '@expo/vector-icons';

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: string;
  orderType: string;
  tableNumber?: string;
  paymentMode: string;
  createdAt: any;
}

const OrderScreen = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.log('No user ID found');
        setError('Please login to view orders');
        setLoading(false);
        return;
      }

      console.log('Fetching orders for user:', userId);
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      console.log('Found orders:', querySnapshot.size);
      
      const ordersList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Order data:', data);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || new Date(),
          total: data.total || 0,
          items: data.items || [],
          status: data.status || 'processing',
          orderType: data.orderType || 'takeaway',
          paymentMode: data.paymentMode || 'cash'
        } as Order;
      });

      console.log('Processed orders:', ordersList);
      setOrders(ordersList);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date not available';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return COLORS.primaryGreenHex;
      case 'processing':
        return COLORS.primaryOrangeHex;
      case 'cancelled':
        return COLORS.primaryRedHex;
      default:
        return COLORS.primaryLightGreyHex;
    }
  };

  const renderOrderItem = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => router.push({
        pathname: '/(app)/OrderStatusScreen',
        params: {
          orderId: order.id,
          total: order.total.toString(),
          paymentMode: order.paymentMode,
          orderType: order.orderType,
          tableNumber: order.tableNumber || '',
        }
      })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{order.id.substring(0, 8)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Type</Text>
          <Text style={styles.detailValue}>
            {order.orderType === 'table' ? `Table ${order.tableNumber}` : 'Takeaway'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Items</Text>
          <Text style={styles.detailValue}>{order.items.length} items</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{order.total.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryOrangeHex}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.push('/HomeScreen')}>
            <GradientBGIcon
              name="home"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Order History</Text>
          <View style={styles.emptyView} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={80}
              color={COLORS.primaryRedHex}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchOrders}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CustomIcon
              name="receipt"
              size={80}
              color={COLORS.primaryLightGreyHex}
            />
            <Text style={styles.emptyText}>No orders yet</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/HomeScreen')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map(renderOrderItem)}
          </View>
        )}
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
    padding: SPACING.space_16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.space_20,
  },
  headerText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
  },
  emptyView: {
    width: FONTSIZE.size_16, // Match icon size for symmetry
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.space_36,
  },
  orderCard: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  orderDate: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_10,
  },
  statusText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.primaryGreyHex,
    marginVertical: SPACING.space_12,
  },
  orderDetails: {
    marginTop: SPACING.space_8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.space_8,
  },
  detailLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  detailValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  totalAmount: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space_36,
  },
  emptyText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_20,
  },
  shopButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    marginTop: SPACING.space_20,
  },
  shopButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.space_36,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryRedHex,
    marginTop: SPACING.space_20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    marginTop: SPACING.space_20,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  ordersContainer: {
    paddingBottom: SPACING.space_24,
  },
});


export default OrderScreen;