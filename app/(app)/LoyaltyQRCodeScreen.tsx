// app/(app)/LoyaltyQRCodeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import { LoyaltyService } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/config';
import { signOut } from 'firebase/auth';
import QRCode from 'react-native-qrcode-svg';
import type { LoyaltyUser } from '../../src/types/loyalty';
import { addDoc, collection, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { MaterialIcons } from '@expo/vector-icons';

const LoyaltyQRCodeScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = new Animated.Value(1);

  // Start QR code pulse animation
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // Generate secure JWT token for QR code
  const generateSecureToken = (userId: string): string => {
    try {
      // In production, use a proper JWT library and server-side signing
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };
      
      const payload = {
        userId: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes expiry
        purpose: 'loyalty_redemption'
      };

      // Simple base64 encoding (use proper JWT signing in production)
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = btoa(`${encodedHeader}.${encodedPayload}.${userId}`); // Mock signature
      
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
      console.error('Token generation error:', error);
      return userId; // Fallback to plain userId
    }
  };

  const loadLoyaltyProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please sign in to view your loyalty QR code');
        router.back();
        return;
      }

      setLoading(true);
      // Get user data from users collection
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile: LoyaltyUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          loyaltyPoints: userData.loyaltyPoints || 0,
          membershipTier: userData.membershipTier || 'Bronze',
          createdAt: userData.createdAt || Timestamp.now(),
          updatedAt: userData.updatedAt || Timestamp.now()
        };
        setLoyaltyProfile(profile);
        setQrToken(generateSecureToken(profile.uid));
      } else {
        // Create a new user profile if one doesn't exist
        const now = Timestamp.now();
        const newProfile: LoyaltyUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          loyaltyPoints: 0,
          membershipTier: 'Bronze',
          createdAt: now,
          updatedAt: now
        };
        
        // Add the profile to users collection
        await setDoc(userDocRef, newProfile);
        setLoyaltyProfile(newProfile);
        setQrToken(generateSecureToken(newProfile.uid));
      }
    } catch (error) {
      console.error('Error loading loyalty profile:', error);
      setError('Failed to load loyalty profile');
    } finally {
      setLoading(false);
    }
  };

  const refreshQRCode = async () => {
    if (!loyaltyProfile) return;
    
    setRefreshing(true);
    try {
      // Generate new token
      setQrToken(generateSecureToken(loyaltyProfile.uid));
      
      // Refresh profile data
      const updatedProfile = await LoyaltyService.getUserProfile(loyaltyProfile.uid);
      if (updatedProfile) {
        setLoyaltyProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      Alert.alert('Error', 'Failed to refresh QR code');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLoyaltyProfile();
    
    // Auto-refresh QR code every 10 minutes
    const interval = setInterval(() => {
      if (loyaltyProfile) {
        setQrToken(generateSecureToken(loyaltyProfile.uid));
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return '#CD7F32';
      case 'Silver': return '#C0C0C0';
      case 'Gold': return '#FFD700';
      case 'Platinum': return '#E5E4E2';
      default: return COLORS.primaryOrangeHex;
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'Bronze':
        return 'Earn 1 point per ₹10 spent • Max ₹20 discount';
      case 'Silver':
        return 'Earn 1.5 points per ₹10 spent • 5% discount • Max ₹50';
      case 'Gold':
        return 'Earn 2 points per ₹10 spent • 10% discount • Max ₹100';
      case 'Platinum':
        return 'Earn 3 points per ₹10 spent • 15% discount + ₹50 • Max ₹200';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading your loyalty profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={COLORS.primaryRedHex} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLoyaltyProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loyaltyProfile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="account-circle" size={64} color={COLORS.primaryLightGreyHex} />
        <Text style={styles.errorText}>No loyalty profile found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLoyaltyProfile}>
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
          <Text style={styles.HeaderText}>Loyalty QR Code</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Header */}
        <View style={styles.UserHeaderContainer}>
          <Text style={styles.WelcomeText}>Hello,</Text>
          <Text style={styles.UserName}>{loyaltyProfile.displayName}</Text>
          <View style={[styles.TierBadge, { backgroundColor: getTierColor(loyaltyProfile.membershipTier) }]}>
            <MaterialIcons name="star" size={16} color={COLORS.primaryWhiteHex} />
            <Text style={styles.TierText}>{loyaltyProfile.membershipTier} Member</Text>
          </View>
        </View>

        {/* Points Display */}
        <View style={styles.PointsContainer}>
          <View style={styles.PointsCard}>
            <Text style={styles.PointsLabel}>Available Points</Text>
            <Text style={styles.PointsValue}>{loyaltyProfile.loyaltyPoints}</Text>
            <Text style={styles.PointsSubtext}>
              ≈ ₹{Math.floor(loyaltyProfile.loyaltyPoints * 0.1)} in rewards
            </Text>
          </View>
        </View>

        {/* QR Code Display */}
        <View style={styles.QRContainer}>
          <View style={styles.QRHeader}>
            <Text style={styles.QRTitle}>Your Loyalty QR Code</Text>
            <TouchableOpacity 
              style={styles.RefreshButton} 
              onPress={refreshQRCode}
              disabled={refreshing}
            >
              <MaterialIcons 
                name="refresh" 
                size={20} 
                color={refreshing ? COLORS.primaryLightGreyHex : COLORS.primaryOrangeHex} 
              />
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[styles.QRCodeWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <QRCode
              value={qrToken}
              size={180}
              backgroundColor={COLORS.primaryWhiteHex}
              color={COLORS.primaryBlackHex}
              logo={require('../../assets/icon.png')}
              logoSize={30}
              logoBackgroundColor="transparent"
            />
          </Animated.View>
          
          <Text style={styles.QRInstructions}>
            Show this QR code to staff to earn or redeem points
          </Text>
          <Text style={styles.QRExpiry}>
            Code refreshes automatically every 15 minutes
          </Text>
        </View>

        {/* Tier Benefits */}
        <View style={styles.BenefitsContainer}>
          <Text style={styles.BenefitsTitle}>Your {loyaltyProfile.membershipTier} Benefits</Text>
          <Text style={styles.BenefitsText}>{getTierBenefits(loyaltyProfile.membershipTier)}</Text>
          
          {loyaltyProfile.membershipTier !== 'Platinum' && (
            <View style={styles.UpgradeHint}>
              <MaterialIcons name="arrow-upward" size={16} color={COLORS.primaryOrangeHex} />
              <Text style={styles.UpgradeText}>
                {loyaltyProfile.membershipTier === 'Bronze' && 'Spend ₹5000 more to reach Silver tier'}
                {loyaltyProfile.membershipTier === 'Silver' && 'Spend ₹10000 more to reach Gold tier'}
                {loyaltyProfile.membershipTier === 'Gold' && 'Spend ₹20000 more to reach Platinum tier'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.ActionsContainer}>
          <TouchableOpacity style={styles.ActionButton} onPress={() => router.push('/transaction-history')}>
            <MaterialIcons name="history" size={24} color={COLORS.primaryOrangeHex} />
            <Text style={styles.ActionButtonText}>Transaction History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ActionButton} onPress={() => router.push('/rewards-catalog')}>
            <MaterialIcons name="redeem" size={24} color={COLORS.primaryOrangeHex} />
            <Text style={styles.ActionButtonText}>Rewards Catalog</Text>
          </TouchableOpacity>
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
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
    padding: SPACING.space_24,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: SPACING.space_24,
    marginTop: SPACING.space_15,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_15,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
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
  logoutText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  UserHeaderContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space_20,
  },
  WelcomeText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryLightGreyHex,
  },
  UserName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryWhiteHex,
    marginVertical: SPACING.space_8,
  },
  TierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    marginTop: SPACING.space_8,
  },
  TierText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
  },
  PointsContainer: {
    paddingHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_20,
  },
  PointsCard: {
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  PointsLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  PointsValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_30,
    color: COLORS.primaryOrangeHex,
    marginVertical: SPACING.space_8,
  },
  PointsSubtext: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
  },
  QRContainer: {
    alignItems: 'center',
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryGreyHex,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_20,
  },
  QRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_20,
  },
  QRTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginRight: SPACING.space_10,
  },
  RefreshButton: {
    padding: SPACING.space_8,
  },
  QRCodeWrapper: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_15,
  },
  QRInstructions: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: SPACING.space_8,
  },
  QRExpiry: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
  BenefitsContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
  },
  BenefitsTitle: {
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
  UpgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.space_15,
    padding: SPACING.space_12,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: BORDERRADIUS.radius_10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryOrangeHex,
  },
  UpgradeText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
    flex: 1,
  },
  ActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: SPACING.space_15,
    marginBottom: SPACING.space_30,
  },
  ActionButton: {
    backgroundColor: COLORS.primaryGreyHex,
    paddingVertical: SPACING.space_15,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.space_8,
  },
  ActionButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_8,
    textAlign: 'center',
  },
});

export default LoyaltyQRCodeScreen;