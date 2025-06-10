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
import { LoyaltyService } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/config';
import type { LoyaltyTransaction, LoyaltyUser } from '../../src/types/loyalty';
import { MaterialIcons } from '@expo/vector-icons';

const LoyaltyScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<LoyaltyUser | null>(null);
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [nextMilestone, setNextMilestone] = useState({ pointsNeeded: 0, rewardValue: 0 });

  const loadLoyaltyData = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'Please sign in to view loyalty points');
      router.back();
      return;
    }

    try {
      setLoading(true);
      
      // Get user profile from loyaltyUsers collection using LoyaltyService
      let profile = await LoyaltyService.getUserProfile(auth.currentUser.uid);
      
      // If profile doesn't exist, create one
      if (!profile) {
        const userData = {
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || 'User',
          ...(auth.currentUser.email && { email: auth.currentUser.email }),
          ...(auth.currentUser.phoneNumber && { phone: auth.currentUser.phoneNumber })
        };
        
        // Get current points from service (this will calculate from transaction history if needed)
        const currentPoints = await LoyaltyService.getUserLoyaltyPoints(auth.currentUser.uid);
        profile = await LoyaltyService.createUserProfile(userData, currentPoints);
      }

      setUserProfile(profile);
      setPoints(profile.loyaltyPoints);

      // Get next milestone using LoyaltyService
      const milestone = LoyaltyService.getNextRewardMilestone(profile.loyaltyPoints);
      setNextMilestone(milestone);

      // Get transaction history using LoyaltyService
      try {
        const history = await LoyaltyService.getLoyaltyHistory(auth.currentUser.uid);
        setTransactions(history);
      } catch (error: any) {
        console.error('Error getting loyalty history:', error);
        if (error.message?.includes('index is currently building')) {
          // Show a temporary message while the index is building
          setTransactions([]);
          Alert.alert(
            'Loading Transactions',
            'Your loyalty history is being prepared. Please check back in a few minutes.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Failed to load transaction history');
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      Alert.alert('Error', 'Failed to load loyalty data');
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

  const formatTransactionDate = (timestamp: any) => {
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

  const getTransactionColor = (transaction: LoyaltyTransaction) => {
    switch (transaction.type) {
      case 'earned':
      case 'bonus':
        return COLORS.primaryGreenHex;
      case 'redeemed':
      case 'tier_discount':
        return COLORS.primaryRedHex;
      case 'adjusted':
        return COLORS.primaryOrangeHex;
      default:
        return COLORS.primaryWhiteHex;
    }
  };

  const getTransactionPrefix = (transaction: LoyaltyTransaction) => {
    switch (transaction.type) {
      case 'earned':
      case 'bonus':
        return '+';
      case 'redeemed':
      case 'tier_discount':
        return '-';
      case 'adjusted':
        return transaction.points >= 0 ? '+' : '-';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading your loyalty data...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load loyalty profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLoyaltyData}>
          <Text style={styles.retryButtonText}>Retry</Text>
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
          <Text style={styles.WelcomeText}>Welcome, {userProfile.displayName}!</Text>
          <Text style={styles.TierText}>
            {userProfile.membershipTier} Member
          </Text>
        </View>

        {/* Points Display */}
        <LoyaltyPointsDisplay
          availablePoints={points}
          nextMilestone={nextMilestone}
        />

        {/* QR Code Button */}
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => router.push('LoyaltyQRCodeScreen')}
        >
          <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
          <Text style={styles.qrButtonText}>Show My QR Code</Text>
        </TouchableOpacity>

        {/* Tier Benefits */}
        <View style={styles.BenefitsContainer}>
          <Text style={styles.BenefitsHeader}>Your {userProfile.membershipTier} Benefits</Text>
          <Text style={styles.BenefitsText}>
            {LoyaltyService.getTierBenefits(userProfile.membershipTier)}
          </Text>
        </View>
        {/* Next Tier Progress */}
        {(() => {
          const nextTierInfo = LoyaltyService.getNextTierProgress(userProfile.membershipTier, points);
          return nextTierInfo.nextTier ? (
            <View style={styles.NextTierContainer}>
              <Text style={styles.NextTierHeader}>
                Next Tier: {nextTierInfo.nextTier}
              </Text>
              <Text style={styles.NextTierText}>
                {nextTierInfo.pointsNeeded} more points needed
              </Text>
            </View>
          ) : (
            <View style={styles.NextTierContainer}>
              <Text style={styles.NextTierHeader}>
                🎉 You've reached the highest tier!
              </Text>
            </View>
          );
        })()}

        {/* Transaction History */}
        <View style={styles.TransactionContainer}>
          <Text style={styles.TransactionHeader}>Transaction History</Text>
          
          {transactions.length === 0 ? (
            <Text style={styles.NoTransactions}>No transactions yet</Text>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.TransactionItem}>
                <View style={styles.TransactionInfo}>
                  <Text style={styles.TransactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.TransactionDate}>
                    {formatTransactionDate(transaction.timestamp)}
                  </Text>
                  <Text style={styles.TransactionType}>
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </Text>
                  {transaction.multiplier && transaction.multiplier > 1 && (
                    <View style={styles.MultiplierBadge}>
                      <Text style={styles.MultiplierText}>{transaction.multiplier}x points</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.TransactionPoints,
                    { color: getTransactionColor(transaction) }
                  ]}>
                  {getTransactionPrefix(transaction)}{Math.abs(transaction.points)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  ScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
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
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryRedHex,
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
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
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
  UserInfoContainer: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_10,
  },
  WelcomeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  TierText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_4,
  },
  BenefitsContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryGreyHex,
  },
  BenefitsHeader: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_10,
  },
  BenefitsText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    lineHeight: 20,
  },
  NextTierContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryDarkGreyHex,
  },
  NextTierHeader: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_4,
  },
  NextTierText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  TransactionContainer: {
    padding: SPACING.space_15,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryGreyHex,
  },
  TransactionHeader: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
  },
  NoTransactions: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    padding: SPACING.space_20,
  },
  TransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.space_10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryDarkGreyHex,
  },
  TransactionInfo: {
    flex: 1,
    marginRight: SPACING.space_10,
  },
  TransactionDescription: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  TransactionDate: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginBottom: SPACING.space_2,
  },
  TransactionType: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryLightGreyHex,
    textTransform: 'capitalize',
  },
  TransactionPoints: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
  },
  MultiplierBadge: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_10,
    alignSelf: 'flex-start',
    marginTop: SPACING.space_4,
  },
  MultiplierText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_15,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  qrButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_10,
  },
});

export default LoyaltyScreen;