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
import { LoyaltyPointsDisplay } from '../../src/components/LoyaltyPointsDisplay';
import { LoyaltyService } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/config';
import type { LoyaltyTransaction } from '../../src/types/loyalty';

const LoyaltyScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
      
      // Get current points
      const currentPoints = await LoyaltyService.getUserLoyaltyPoints(auth.currentUser.uid);
      setPoints(currentPoints);

      // Get next milestone
      const milestone = LoyaltyService.getNextRewardMilestone(currentPoints);
      setNextMilestone(milestone);

      // Get transaction history
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
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
          <View style={styles.EmptyView} />
        </View>

        {/* Points Display */}
        <LoyaltyPointsDisplay
          availablePoints={points}
          pointsToNextReward={nextMilestone.pointsNeeded}
          nextRewardValue={nextMilestone.rewardValue}
        />

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
                    {transaction.timestamp.toDate().toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.TransactionPoints,
                    {
                      color:
                        transaction.type === 'earned'
                          ? COLORS.primaryGreenHex
                          : COLORS.primaryRedHex,
                    },
                  ]}>
                  {transaction.type === 'earned' ? '+' : '-'}
                  {Math.abs(transaction.points)}
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
    alignItems: 'center',
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
  },
  TransactionDate: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_4,
  },
  TransactionPoints: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
  },
});

export default LoyaltyScreen; 