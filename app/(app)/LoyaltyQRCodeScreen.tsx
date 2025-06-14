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
import { auth } from '../../src/firebase/config';
import { signOut } from 'firebase/auth';
import QRCode from 'react-native-qrcode-svg';
import type { LoyaltyUser } from '../../src/types/loyalty';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
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
        purpose: 'loyalty_discount'
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
          totalOrders: userData.totalOrders || 0,
          totalSpent: userData.totalSpent || 0,
          isFirstTimeUser: userData.isFirstTimeUser ?? true,
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
          totalOrders: 0,
          totalSpent: 0,
          isFirstTimeUser: true,
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
      await loadLoyaltyProfile();
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

  const maxDiscount = loyaltyProfile.loyaltyPoints; // 1 point = 1 rupee discount

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
        </View>

        {/* Points Display */}
        <View style={styles.PointsContainer}>
          <View style={styles.PointsCard}>
            <Text style={styles.PointsLabel}>Available Points</Text>
            <Text style={styles.PointsValue}>{loyaltyProfile.loyaltyPoints}</Text>
            <Text style={styles.PointsSubtext}>
              Maximum Discount: ₹{maxDiscount}
            </Text>
          </View>
        </View>

        {/* QR Code Display */}
        <View style={styles.QRContainer}>
          <View style={styles.QRHeader}>
            <Text style={styles.QRTitle}>Show QR Code to Staff</Text>
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
              size={200}
              backgroundColor={COLORS.primaryWhiteHex}
              color={COLORS.primaryBlackHex}
              logo={require('../../assets/icon.png')}
              logoSize={40}
              logoBackgroundColor="transparent"
            />
          </Animated.View>
          
          <Text style={styles.QRInstructions}>
            Staff will scan this code during billing to apply your discount automatically
          </Text>
          <Text style={styles.QRExpiry}>
            Code refreshes every 15 minutes for security
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.HowItWorksContainer}>
          <Text style={styles.HowItWorksTitle}>How It Works</Text>
          
          <View style={styles.StepContainer}>
            <View style={styles.StepNumber}>
              <Text style={styles.StepNumberText}>1</Text>
            </View>
            <View style={styles.StepContent}>
              <Text style={styles.StepTitle}>Show QR Code</Text>
              <Text style={styles.StepDescription}>Present this QR code to staff during checkout</Text>
            </View>
          </View>

          <View style={styles.StepContainer}>
            <View style={styles.StepNumber}>
              <Text style={styles.StepNumberText}>2</Text>
            </View>
            <View style={styles.StepContent}>
              <Text style={styles.StepTitle}>Automatic Discount</Text>
              <Text style={styles.StepDescription}>Maximum available discount will be applied automatically</Text>
            </View>
          </View>

          <View style={styles.StepContainer}>
            <View style={styles.StepNumber}>
              <Text style={styles.StepNumberText}>3</Text>
            </View>
            <View style={styles.StepContent}>
              <Text style={styles.StepTitle}>Earn More Points</Text>
              <Text style={styles.StepDescription}>Get 1 point for every ₹10 spent on final discounted amount</Text>
            </View>
          </View>
        </View>

        {/* Discount Rules */}
        <View style={styles.RulesContainer}>
          <Text style={styles.RulesTitle}>💡 Discount Rules</Text>
          <View style={styles.RuleItem}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.primaryOrangeHex} />
            <Text style={styles.RuleText}>1 Point = ₹1 Discount</Text>
          </View>
          <View style={styles.RuleItem}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.primaryOrangeHex} />
            <Text style={styles.RuleText}>Maximum discount applied automatically</Text>
          </View>
          <View style={styles.RuleItem}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.primaryOrangeHex} />
            <Text style={styles.RuleText}>Earn 1 point per ₹10 on final amount</Text>
          </View>
          <View style={styles.RuleItem}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.primaryOrangeHex} />
            <Text style={styles.RuleText}>No minimum purchase required</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.ActionsContainer}>
          <TouchableOpacity style={styles.ActionButton} onPress={() => router.push('/transaction-history')}>
            <MaterialIcons name="history" size={24} color={COLORS.primaryOrangeHex} />
            <Text style={styles.ActionButtonText}>Transaction History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ActionButton} onPress={() => router.push('/HowToEarnScreen')}>
            <MaterialIcons name="help-outline" size={24} color={COLORS.primaryOrangeHex} />
            <Text style={styles.ActionButtonText}>How to Earn</Text>
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
    marginTop: SPACING.space_8,
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
    fontSize: FONTSIZE.size_36,
    color: COLORS.primaryOrangeHex,
    marginVertical: SPACING.space_8,
  },
  PointsSubtext: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
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
    padding: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_15,
    elevation: 5,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  QRInstructions: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginBottom: SPACING.space_8,
    lineHeight: 20,
  },
  QRExpiry: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
  HowItWorksContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
  },
  HowItWorksTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
    textAlign: 'center',
  },
  StepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.space_15,
  },
  StepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryOrangeHex,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.space_12,
  },
  StepNumberText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  StepContent: {
    flex: 1,
  },
  StepTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  StepDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    lineHeight: 16,
  },
  RulesContainer: {
    margin: SPACING.space_15,
    padding: SPACING.space_20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: BORDERRADIUS.radius_15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryOrangeHex,
  },
  RulesTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_15,
  },
  RuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  RuleText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
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