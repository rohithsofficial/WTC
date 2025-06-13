import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import LoyaltyPointsDisplay from '../../src/components/LoyaltyPointsDisplay';
import LoyaltyTransaction from '../../src/components/LoyaltyTransaction';
import { loyaltyService, UserLoyaltyProfile, ComprehensiveLoyaltyTransaction } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/config';
import { MaterialIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';

const LoyaltyScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserLoyaltyProfile | null>(null);
  const [points, setPoints] = useState(0);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<ComprehensiveLoyaltyTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLoyaltyData = async () => {
    if (!auth.currentUser) {
      setError('Please sign in to view loyalty points');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get user profile using loyaltyService
      const profile = await loyaltyService.getUserLoyaltyProfile(auth.currentUser.uid);
      
      if (profile) {
        // Ensure dates are properly handled
        const processedProfile = {
          ...profile,
          createdAt: profile.createdAt instanceof Timestamp ? profile.createdAt.toDate() : profile.createdAt,
          updatedAt: profile.updatedAt instanceof Timestamp ? profile.updatedAt.toDate() : profile.updatedAt
        };
        
        setUserProfile(processedProfile);
        setPoints(processedProfile.availablePoints || 0);

        // Fetch loyalty transaction history from loyaltyTransactions collection
        try {
          // Get transactions from loyaltyTransactions collection
          const transactions = await loyaltyService.getComprehensiveLoyaltyTransactions(auth.currentUser.uid);
          
          if (transactions && Array.isArray(transactions) && transactions.length > 0) {
            // Process transactions - ensure proper date handling
            const processedTransactions = transactions.map(transaction => ({
              ...transaction,
              timestamp: transaction.transactionDetails.timestamp instanceof Timestamp 
                ? transaction.transactionDetails.timestamp.toDate() 
                : transaction.transactionDetails.timestamp,
              createdAt: transaction.auditTrail.createdAt instanceof Timestamp 
                ? transaction.auditTrail.createdAt.toDate() 
                : transaction.auditTrail.createdAt,
              updatedAt: transaction.auditTrail.updatedAt instanceof Timestamp 
                ? transaction.auditTrail.updatedAt.toDate() 
                : transaction.auditTrail.updatedAt
            }));
            
            // Sort by timestamp (newest first)
            processedTransactions.sort((a, b) => {
              const timeA = a.transactionDetails.timestamp instanceof Date 
                ? a.transactionDetails.timestamp.getTime() 
                : new Date(a.transactionDetails.timestamp).getTime();
              const timeB = b.transactionDetails.timestamp instanceof Date 
                ? b.transactionDetails.timestamp.getTime() 
                : new Date(b.transactionDetails.timestamp).getTime();
              return timeB - timeA;
            });
            
            setLoyaltyTransactions(processedTransactions);
          } else {
            console.log('No loyalty transactions found');
            setLoyaltyTransactions([]);
          }
        } catch (transactionError) {
          console.error('Error fetching loyalty transactions:', transactionError);
          setLoyaltyTransactions([]);
        }
      } else {
        // Create new profile if none exists
        const newProfile: UserLoyaltyProfile = {
          userId: auth.currentUser.uid,
          availablePoints: 0,
          totalOrders: 0,
          totalSpent: 0,
          isFirstTimeUser: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Create the profile in the database
        await loyaltyService.createLoyaltyProfile(newProfile);
        setUserProfile(newProfile);
        setPoints(0);
        setLoyaltyTransactions([]);
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      setError('Failed to load loyalty data. Please try again.');
      setLoyaltyTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadLoyaltyData();
    }, [])
  );

  const formatTransactionDate = (timestamp: Date | Timestamp) => {
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getTransactionColor = (transaction: ComprehensiveLoyaltyTransaction) => {
    const pointsAmount = transaction.loyaltyDetails.pointsEarned - transaction.loyaltyDetails.pointsRedeemed;
    if (pointsAmount > 0) {
      return COLORS.primaryGreenHex;
    } else if (pointsAmount < 0) {
      return COLORS.primaryRedHex;
    }
    return COLORS.primaryLightGreyHex;
  };

  const getTransactionPrefix = (transaction: ComprehensiveLoyaltyTransaction) => {
    const pointsAmount = transaction.loyaltyDetails.pointsEarned - transaction.loyaltyDetails.pointsRedeemed;
    return pointsAmount > 0 ? '+' : '';
  };

  // Transform your comprehensive transactions to match LoyaltyTransaction component expectations
  const transformTransactionsForComponent = (transactions: ComprehensiveLoyaltyTransaction[]) => {
  return transactions.map(transaction => {
    const pointsAmount = transaction.loyaltyDetails.pointsEarned - transaction.loyaltyDetails.pointsRedeemed;
    const orderNumber = transaction.orderId?.slice(-6) || 'Unknown';
    const itemCount = transaction.orderDetails.items?.length || 0;
    const orderTotal = transaction.orderDetails.finalAmount || 0;
    
    let description = '';
    let type = '';
    
    if (pointsAmount > 0) {
      // Points earned - should be GREEN with + sign
      type = 'earned';
      if (itemCount === 1) {
        description = `Earned from your order • ₹${orderTotal}`;
      } else {
        description = `Earned from ${itemCount} items • ₹${orderTotal}`;
      }
    } else if (pointsAmount < 0) {
      // Points redeemed - should be RED with - sign  
      type = 'redeemed';
      const pointsUsed = Math.abs(pointsAmount);
      const discountAmount = pointsUsed * 0.1; // Adjust based on your conversion rate
      description = `Redeemed for ₹${discountAmount.toFixed(0)} discount`;
    } else {
      type = 'neutral';
      description = `Order completed • ₹${orderTotal}`;
    }
    
    return {
      id: transaction.id,
      orderId: transaction.orderId,
      points: Math.abs(pointsAmount), // Always show positive number
      timestamp: transaction.transactionDetails.timestamp,
      type: type,
      description: description,
      notes: transaction.transactionDetails.notes
    };
  });
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading your loyalty data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.primaryOrangeHex} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLoyaltyData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="account-circle" size={48} color={COLORS.primaryOrangeHex} />
        <Text style={styles.errorText}>No loyalty profile found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLoyaltyData}>
          <Text style={styles.retryButtonText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.ScreenContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ScrollViewFlex}>
        
        {/* Header */}
        <View style={styles.HeaderContainer}>
          <TouchableOpacity onPress={() => router.back()}>
            <GradientBGIcon
              name="left"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.HeaderText}>Loyalty Points</Text>
          <TouchableOpacity onPress={() => router.push('/LoyaltyQRCodeScreen')}>
            <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={styles.UserInfoContainer}>
          <Text style={styles.WelcomeText}>Welcome!</Text>
          <Text style={styles.TierText}>
            {userProfile.isFirstTimeUser ? 'New Member' : 'Loyal Member'}
          </Text>
        </View>

        {/* Points Display */}
        <LoyaltyPointsDisplay points={points} />

        {/* QR Code Button */}
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => router.push('/LoyaltyQRCodeScreen')}>
          <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
          <Text style={styles.qrButtonText}>Show QR Code</Text>
        </TouchableOpacity>
   {/* Transaction History - Using LoyaltyTransaction Component */}
       <LoyaltyTransaction
          transactions={transformTransactionsForComponent(loyaltyTransactions)}
          styles={styles}
          COLORS={COLORS}
          formatTransactionDate={formatTransactionDate}
          getTransactionColor={(transaction) => {
            // CORRECTED: Green for earned, Red for redeemed
            if (transaction.type === 'earned') {
              return COLORS.primaryGreenHex; // GREEN for points earned
            } else if (transaction.type === 'redeemed') {
              return COLORS.primaryRedHex; // RED for points redeemed/spent
            }
            return COLORS.primaryLightGreyHex;
          }}
          getTransactionPrefix={(transaction) => {
            // CORRECTED: + for earned, - for redeemed
            if (transaction.type === 'earned') {
              return '+'; // Plus sign for earned points
            } else if (transaction.type === 'redeemed') {
              return '-'; // Minus sign for redeemed points
            }
            return '';
          }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  ScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  ScrollViewFlex: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  loadingText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    marginTop: SPACING.space_10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
    padding: SPACING.space_20,
  },
  errorText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_10,
  },
  retryButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
  },
  HeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.space_15,
    backgroundColor: COLORS.primaryBlackHex,
  },
  HeaderText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_20,
    fontWeight: '600',
  },
  UserInfoContainer: {
    padding: SPACING.space_15,
    backgroundColor: COLORS.primaryDarkGreyHex,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  WelcomeText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_20,
    fontWeight: '600',
    marginBottom: SPACING.space_4,
  },
  TierText: {
    color: COLORS.primaryOrangeHex,
    fontSize: FONTSIZE.size_16,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    margin: SPACING.space_15,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  qrButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
    marginLeft: SPACING.space_10,
  },
  // Styles needed for LoyaltyTransaction component
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.space_30,
    margin: SPACING.space_15,
  },
  NoTransactionsText: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '500',
    marginTop: SPACING.space_10,
  },
  emptyStateSubtext: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
    textAlign: 'center',
    marginTop: SPACING.space_4,
  },
  TransactionInfo: {
    flex: 1,
    marginRight: SPACING.space_10,
  },
  TransactionDate: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_12,
    marginBottom: SPACING.space_4,
  },
  TransactionType: {
    color: COLORS.primaryBlackHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '500',
    marginBottom: SPACING.space_4,
  },
  TransactionDescription: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_12,
  },
  TransactionPoints: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
  },
});

export default LoyaltyScreen;