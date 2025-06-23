// app//(app)/OrderScreen.tsx

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
  Platform,
  TextInput,
  Image,
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
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import CustomIcon from '../../src/components/CustomIcon';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';

// Define interfaces
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  description?: string;
  category?: string;
  customizations?: Customization[];
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: string;
  orderType: 'dinein' | 'takeaway' | 'offline';
  tableNumber?: string;
  paymentMode: string;
  createdAt: any;
  baristaNotes?: string;
  rating?: number;
  mood?: string;
  isRewardEarned?: boolean;
  isOfflineOrder?: boolean;
}

interface Customization {
  name: string;
  value: string;
}

type OrderCategory = 'all' | 'ongoing' | 'completed' | 'cancelled';
type DateFilter = 'today' | 'week' | 'custom';

const OrderScreen = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });

  // Stats
  const [totalOrders, setTotalOrders] = useState(0);
  const [favoriteDrink, setFavoriteDrink] = useState('');
  const [mostActiveTime, setMostActiveTime] = useState('');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      setError('Please login to view orders');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date(),
        totalAmount: doc.data().totalAmount || 0,
        items: doc.data().items || [],
        orderStatus: doc.data().orderStatus || 'Order Placed',
        orderType: doc.data().orderType || 'takeaway',
        paymentMode: doc.data().paymentMode || 'cash',
        baristaNotes: doc.data().baristaNotes || '',
        rating: doc.data().rating || 0,
        mood: doc.data().mood || '',
        isRewardEarned: doc.data().isRewardEarned || false,
        isOfflineOrder: doc.data().isOfflineOrder || false
      } as Order));

      setOrders(ordersList);
      calculateStats(ordersList);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error listening to orders:', error);
      setError('Failed to load orders. Please try again.');
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const calculateStats = (ordersList: Order[]) => {
    setTotalOrders(ordersList.length);
    
    // Calculate favorite drink
    const drinkCounts = ordersList.reduce((acc, order) => {
      order.items.forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + 1;
      });
      return acc;
    }, {} as { [key: string]: number });
    
    const favorite = Object.entries(drinkCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No orders yet';
    setFavoriteDrink(favorite);

    // Calculate most active time
    const timeCounts = ordersList.reduce((acc, order) => {
      const hour = new Date(order.createdAt.toDate()).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    const mostActive = Object.entries(timeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '0';
    setMostActiveTime(`${mostActive}:00`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'served':
      case 'collected':
        return '#4CAF50'; // Green
      case 'preparing':
      case 'ready':
        return '#FF9800'; // Orange
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#2196F3'; // Blue for ongoing
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(order => {
        switch (selectedCategory) {
          case 'ongoing':
            return !['Collected', 'Served', 'Cancelled'].includes(order.orderStatus);
          case 'completed':
            return ['Collected', 'Served'].includes(order.orderStatus);
          case 'cancelled':
            return order.orderStatus === 'Cancelled';
          default:
            return true;
        }
      });
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    filtered = filtered.filter(order => {
      const orderDate = order.createdAt.toDate();
      switch (dateFilter) {
        case 'today':
          return orderDate >= today;
        case 'week':
          return orderDate >= weekAgo;
        case 'custom':
          return orderDate >= customDateRange.start && orderDate <= customDateRange.end;
        default:
          return true;
      }
    });

    // Enhanced Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => {
        // Search in order ID
        if (order.id.toLowerCase().includes(query)) return true;

        // Search in order type
        if (order.orderType.toLowerCase().includes(query)) return true;

        // Search in order status
        if (order.orderStatus.toLowerCase().includes(query)) return true;

        // Search in payment mode
        if (order.paymentMode.toLowerCase().includes(query)) return true;

        // Search in table number for dine-in orders
        if (order.tableNumber && order.tableNumber.toLowerCase().includes(query)) return true;

        // Search in total amount
        if (order.totalAmount.toString().includes(query)) return true;

        // Search in items
        return order.items.some(item => {
          // Search in item name
          if (item.name.toLowerCase().includes(query)) return true;

          // Search in item description
          if (item.description?.toLowerCase().includes(query)) return true;

          // Search in item price
          if (item.price?.toString().includes(query)) return true;

          // Search in item quantity
          if (item.quantity?.toString().includes(query)) return true;

          // Search in item category
          if (item.category?.toLowerCase().includes(query)) return true;

          // Search in item size
          if (item.size?.toLowerCase().includes(query)) return true;

          // Search in item customizations
          if (item.customizations?.some(custom => 
            custom.name.toLowerCase().includes(query)
          )) return true;

          return false;
        });
      });
    }

    return filtered;
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically update the orders
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

  const renderOrderItem = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => router.push({
        pathname: '/(app)/OrderStatusScreen',
        params: {
          orderId: order.id,
          totalAmount: order.totalAmount.toString(),
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) }]}>
          <Text style={styles.statusText}>{order.orderStatus}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Type</Text>
          <Text style={styles.detailValue}>
            {order.orderType === 'dinein' 
              ? `Table ${order.tableNumber}` 
              : order.orderType === 'offline'
                ? 'Offline Order'
                : 'Takeaway'}
          </Text>
        </View>

        {/* Product Details Section */}
        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>Ordered Items:</Text>
          {order.isOfflineOrder ? (
            <View style={styles.offlineOrderMessage}>
              <MaterialIcons name="offline-pin" size={24} color={COLORS.primaryGreyHex} />
              <Text style={styles.offlineOrderText}>
                This was an offline order. Item details are not available.
              </Text>
            </View>
          ) : (
            order.items.map((item: OrderItem, index: number) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productQuantity}>x{item.quantity}</Text>
                </View>
                
                {item.size && (
                  <Text style={styles.productDetail}>Size: {item.size}</Text>
                )}
                
                {item.customizations && item.customizations.length > 0 && (
                  <View style={styles.customizationsContainer}>
                    <Text style={styles.customizationsLabel}>Customizations:</Text>
                    {item.customizations.map((custom: Customization, idx: number) => (
                      <Text key={idx} style={styles.customizationItem}>• {getCustomizationText(custom, idx)}</Text>
                    ))}
                  </View>
                )}
                
                <View style={styles.productPriceContainer}>
                  <Text style={styles.productPrice}>
                    ₹{(Number(item.price || 0) * item.quantity).toFixed(2)}
                  </Text>
                  {item.quantity > 1 && (
                    <Text style={styles.unitPrice}>
                      (₹{Number(item.price || 0).toFixed(2)} each)
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>

        {order.baristaNotes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Barista Notes:</Text>
            <Text style={styles.notesText}>{order.baristaNotes}</Text>
          </View>
        )}

        {order.isRewardEarned && (
          <View style={styles.rewardContainer}>
            <MaterialIcons name="stars" size={20} color={COLORS.primaryOrangeHex} />
            <Text style={styles.rewardText}>Reward Points Earned!</Text>
          </View>
        )}

        {['Collected', 'Served'].includes(order.orderStatus) && !order.rating && (
          <TouchableOpacity style={styles.rateButton}>
            <Text style={styles.rateButtonText}>Rate Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Your Coffee Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialIcons name="coffee" size={24} color={COLORS.primaryOrangeHex} />
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="favorite" size={24} color={COLORS.primaryOrangeHex} />
          <Text style={styles.statValue}>{favoriteDrink}</Text>
          <Text style={styles.statLabel}>Favorite Drink</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="schedule" size={24} color={COLORS.primaryOrangeHex} />
          <Text style={styles.statValue}>{mostActiveTime}</Text>
          <Text style={styles.statLabel}>Most Active Time</Text>
        </View>
      </View>
    </View>
  );

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
      'milk_type_specific': 'Milk Type',
      'milk_ratio_amount': 'Milk Ratio Amount',
      'sugar_type_specific': 'Sugar Type',
      'sugar_amount_specific': 'Sugar Amount',
      'ice_amount_specific': 'Ice Amount',
      'ice_type_specific': 'Ice Type',
      'topping_amount_specific': 'Topping Amount',
      'syrup_amount_specific': 'Syrup Amount',
      'syrup_type_specific': 'Syrup Type',
      'espresso_amount_specific': 'Espresso Amount',
      'foam_amount_specific': 'Foam Amount',
      'whip_amount_specific': 'Whipped Cream Amount',
      'drizzle_amount_specific': 'Drizzle Amount',
      'drizzle_type_specific': 'Drizzle Type',
      'spice_amount_specific': 'Spice Amount',
      'sweetness_amount_specific': 'Sweetness Amount',
      'strength_amount_specific': 'Strength Amount',
      'blend_type_specific': 'Blend Type',
      'roast_level_specific': 'Roast Level',
      'grind_size_specific': 'Grind Size',
      'water_ratio_specific': 'Water Ratio',
      'steam_level_specific': 'Steam Level',
      'foam_density_level_specific': 'Foam Density Level',
      'milk_temp_level_specific': 'Milk Temperature Level',
    };

    return customMap[custom.name] || custom.name;
  };

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top']}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={COLORS.primaryBlackHex} 
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Order History</Text>
          <View style={styles.emptyView} />
        </View>

        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color={COLORS.primaryBlackHex} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID, items, price, type..."
            placeholderTextColor={COLORS.primaryGreyHex}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <MaterialIcons name="close" size={24} color={COLORS.primaryBlackHex} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'ongoing', label: 'Ongoing' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTab,
                selectedCategory === category.id && styles.categoryTabActive
              ]}
              onPress={() => setSelectedCategory(category.id as OrderCategory)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date Filter */}
        <View style={styles.dateFilterContainer}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'custom', label: 'Custom' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.dateFilterButton,
                dateFilter === filter.id && styles.dateFilterButtonActive
              ]}
              onPress={() => {
                if (filter.id === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setDateFilter(filter.id as DateFilter);
                }
              }}
            >
              <Text style={[
                styles.dateFilterText,
                dateFilter === filter.id && styles.dateFilterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
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
            {error === 'Please login to view orders' ? (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setRefreshing(true);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CustomIcon
              name="receipt"
              size={80}
              color={COLORS.primaryGreyHex}
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
          <>
            {renderStats()}
            <View style={styles.ordersContainer}>
              {filterOrders().map(renderOrderItem)}
            </View>
          </>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={customDateRange.start}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setCustomDateRange(prev => ({
                ...prev,
                start: selectedDate
              }));
              setDateFilter('custom');
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  scrollViewContent: {
    padding: SPACING.space_16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.space_20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  emptyView: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.space_36,
  },
  orderCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  orderDate: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
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
    opacity: 0.2,
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
    color: COLORS.primaryGreyHex,
  },
  detailValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
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
    color: COLORS.primaryGreyHex,
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
  loginButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    marginTop: SPACING.space_20,
  },
  loginButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  ordersContainer: {
    paddingBottom: SPACING.space_24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.space_8,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    height: 40,
  },
  clearButton: {
    padding: SPACING.space_4,
  },
  categoryContainer: {
    marginBottom: SPACING.space_16,
  },
  categoryContent: {
    paddingHorizontal: SPACING.space_24,
  },
  categoryTab: {
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_25,
    marginRight: SPACING.space_12,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderColor: COLORS.primaryOrangeHex,
  },
  categoryText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  categoryTextActive: {
    color: COLORS.primaryWhiteHex,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_16,
  },
  dateFilterButton: {
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_25,
    marginRight: SPACING.space_12,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  dateFilterButtonActive: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderColor: COLORS.primaryOrangeHex,
  },
  dateFilterText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  dateFilterTextActive: {
    color: COLORS.primaryWhiteHex,
  },
  statsContainer: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_8,
  },
  statLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_4,
  },
  notesContainer: {
    marginTop: SPACING.space_12,
    padding: SPACING.space_12,
    backgroundColor: '#FFF8E1',
    borderRadius: BORDERRADIUS.radius_10,
  },
  notesLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_4,
  },
  notesText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryBlackHex,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.space_12,
    padding: SPACING.space_12,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDERRADIUS.radius_10,
  },
  rewardText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreenHex,
    marginLeft: SPACING.space_8,
  },
  rateButton: {
    marginTop: SPACING.space_12,
    padding: SPACING.space_12,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    alignItems: 'center',
  },
  rateButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  productsContainer: {
    marginTop: SPACING.space_16,
    marginBottom: SPACING.space_16,
  },
  productsTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_12,
  },
  productItem: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_12,
    marginBottom: SPACING.space_8,
    borderWidth: 1,
    borderColor: '#E8E8D0',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_4,
  },
  productName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    flex: 1,
  },
  productQuantity: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
  },
  productDetail: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_4,
  },
  customizationsContainer: {
    marginTop: SPACING.space_8,
  },
  customizationsLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_4,
  },
  customizationItem: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
    marginBottom: SPACING.space_2,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
  productPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  unitPrice: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E8E8D0',
    marginVertical: SPACING.space_16,
  },
  offlineOrderMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_10,
    marginTop: SPACING.space_8,
  },
  offlineOrderText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_12,
    flex: 1,
  },
});

export default OrderScreen;