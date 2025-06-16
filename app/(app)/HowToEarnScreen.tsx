// app/(app)/HowToEarnScreen.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import { MaterialIcons } from '@expo/vector-icons';

const HowToEarnScreen = () => {
  const router = useRouter();

  const earningMethods = [
    {
      icon: 'shopping-cart',
      title: 'Make Purchases',
      description: 'Earn 1 point for every ₹10 spent',
      details: 'Points are calculated on the final amount after any discounts are applied.',
      color: COLORS.primaryOrangeHex,
    },
    {
      icon: 'people',
      title: 'Refer Friends',
      description: 'Get 50 bonus points per referral',
      details: 'When your friend makes their first purchase using your referral code.',
      color: '#4CAF50',
    },
    {
      icon: 'star',
      title: 'Write Reviews',
      description: 'Earn 10 points per review',
      details: 'Share your experience and help other customers make informed choices.',
      color: '#FF9800',
    },
    {
      icon: 'cake',
      title: 'Birthday Bonus',
      description: 'Get 100 points on your birthday',
      details: 'Celebrate with us! Points are automatically added on your special day.',
      color: '#E91E63',
    },
    {
      icon: 'local-offer',
      title: 'Special Promotions',
      description: 'Extra points during events',
      details: 'Look out for double point days, seasonal bonuses, and special campaigns.',
      color: '#9C27B0',
    },
  ];

  const tips = [
    {
      icon: 'lightbulb-outline',
      text: 'Use your QR code every time you shop to ensure points are credited',
    },
    {
      icon: 'calendar-today',
      text: 'Check for special point multiplier events during holidays',
    },
    {
      icon: 'account-circle',
      text: 'Keep your profile updated to receive birthday bonuses',
    },
    {
      icon: 'notifications',
      text: 'Enable notifications to never miss earning opportunities',
    },
  ];

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
          <Text style={styles.HeaderText}>How to Earn Points</Text>
          <View style={styles.HeaderSpacer} />
        </View>

        {/* Hero Section */}
        <View style={styles.HeroContainer}>
          <View style={styles.HeroIconContainer}>
            <MaterialIcons name="stars" size={48} color={COLORS.primaryOrangeHex} />
          </View>
          <Text style={styles.HeroTitle}>Start Earning Rewards</Text>
          <Text style={styles.HeroSubtitle}>
            Every purchase brings you closer to amazing discounts and rewards
          </Text>
        </View>

        {/* Earning Methods */}
        <View style={styles.SectionContainer}>
          <Text style={styles.SectionTitle}>Ways to Earn Points</Text>
          
          {earningMethods.map((method, index) => (
            <View key={index} style={styles.EarningMethodCard}>
              <View style={[styles.MethodIconContainer, { backgroundColor: method.color }]}>
                <MaterialIcons name={method.icon as any} size={24} color={COLORS.primaryWhiteHex} />
              </View>
              
              <View style={styles.MethodContent}>
                <Text style={styles.MethodTitle}>{method.title}</Text>
                <Text style={styles.MethodDescription}>{method.description}</Text>
                <Text style={styles.MethodDetails}>{method.details}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Point Calculation Example */}
        <View style={styles.ExampleContainer}>
          <Text style={styles.ExampleTitle}>💰 Example Calculation</Text>
          
          <View style={styles.CalculationCard}>
            <View style={styles.CalculationRow}>
              <Text style={styles.CalculationLabel}>Bill Amount:</Text>
              <Text style={styles.CalculationValue}>₹250</Text>
            </View>
            
            <View style={styles.CalculationRow}>
              <Text style={styles.CalculationLabel}>Current Points Used:</Text>
              <Text style={styles.CalculationValue}>-₹50</Text>
            </View>
            
            <View style={[styles.CalculationRow, styles.DividerLine]}>
              <Text style={styles.CalculationLabel}>Final Amount:</Text>
              <Text style={styles.CalculationValue}>₹200</Text>
            </View>
            
            <View style={styles.CalculationRow}>
              <Text style={[styles.CalculationLabel, styles.EarnedText]}>Points Earned:</Text>
              <Text style={[styles.CalculationValue, styles.EarnedText]}>20 Points</Text>
            </View>
            
            <Text style={styles.CalculationNote}>
              ₹200 ÷ ₹10 = 20 points earned
            </Text>
          </View>
        </View>

        {/* Pro Tips */}
        <View style={styles.TipsContainer}>
          <Text style={styles.TipsTitle}>💡 Pro Tips</Text>
          
          {tips.map((tip, index) => (
            <View key={index} style={styles.TipItem}>
              <MaterialIcons name={tip.icon as any} size={20} color={COLORS.primaryOrangeHex} />
              <Text style={styles.TipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* Point Values */}
        <View style={styles.ValuesContainer}>
          <Text style={styles.ValuesTitle}>Point Values</Text>
          
          <View style={styles.ValueGrid}>
            <View style={styles.ValueCard}>
              <Text style={styles.ValueNumber}>1</Text>
              <Text style={styles.ValueLabel}>Point</Text>
              <Text style={styles.ValueEquals}>=</Text>
              <Text style={styles.ValueAmount}>₹1</Text>
              <Text style={styles.ValueDescription}>Discount</Text>
            </View>
            
            <View style={styles.ValueCard}>
              <Text style={styles.ValueNumber}>10</Text>
              <Text style={styles.ValueLabel}>Points</Text>
              <Text style={styles.ValueEquals}>=</Text>
              <Text style={styles.ValueAmount}>₹100</Text>
              <Text style={styles.ValueDescription}>Purchase</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.ActionsContainer}>
          <TouchableOpacity 
            style={styles.PrimaryActionButton} 
            onPress={() => router.push('/LoyaltyQRCodeScreen')}
          >
            <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
            <Text style={styles.PrimaryActionText}>Show My QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.SecondaryActionButton} 
            onPress={() => router.push('/LoyaltyScreen')}
          >
            <MaterialIcons name="history" size={24} color={COLORS.primaryOrangeHex} />
            <Text style={styles.SecondaryActionText}>View History</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.FooterContainer}>
          <MaterialIcons name="info-outline" size={16} color={COLORS.primaryLightGreyHex} />
          <Text style={styles.FooterText}>
            Points are credited within 24 hours of purchase. Points have no expiry date.
          </Text>
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
  HeaderSpacer: {
    width: 24,
  },
  HeroContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space_30,
    paddingHorizontal: SPACING.space_24,
  },
  HeroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_20,
  },
  HeroTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: SPACING.space_10,
  },
  HeroSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    lineHeight: 20,
  },
  SectionContainer: {
    margin: SPACING.space_15,
  },
  SectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_20,
  },
  EarningMethodCard: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_20,
    marginBottom: SPACING.space_15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  MethodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.space_15,
  },
  MethodContent: {
    flex: 1,
  },
  MethodTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  MethodDescription: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_8,
  },
  MethodDetails: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    lineHeight: 16,
  },
  ExampleContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: BORDERRADIUS.radius_15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  ExampleTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
  },
  CalculationCard: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
  },
  CalculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_8,
  },
  DividerLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
    paddingTop: SPACING.space_12,
  },
  CalculationLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  CalculationValue: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  EarnedText: {
    color: '#4CAF50',
  },
  CalculationNote: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_10,
    fontStyle: 'italic',
  },
  TipsContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: BORDERRADIUS.radius_15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryOrangeHex,
  },
  TipsTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
  },
  TipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.space_12,
  },
  TipText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_12,
    flex: 1,
    lineHeight: 18,
  },
  ValuesContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
  },
  ValuesTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_20,
    textAlign: 'center',
  },
  ValueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ValueCard: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
    flex: 1,
    marginHorizontal: SPACING.space_8,
  },
  ValueNumber: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryOrangeHex,
  },
  ValueLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginBottom: SPACING.space_8,
  },
  ValueEquals: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  ValueAmount: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_18,
    color: '#4CAF50',
  },
  ValueDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryLightGreyHex,
  },
  ActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: SPACING.space_15,
    gap: SPACING.space_12,
  },
  PrimaryActionButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  PrimaryActionText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
  },
  SecondaryActionButton: {
    backgroundColor: COLORS.primaryGreyHex,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  SecondaryActionText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
  },
  FooterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: SPACING.space_15,
    marginTop: SPACING.space_10,
    marginBottom: SPACING.space_30,
    padding: SPACING.space_15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDERRADIUS.radius_10,
  },
  FooterText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginLeft: SPACING.space_8,
    flex: 1,
    lineHeight: 16,
  },
});

export default HowToEarnScreen;