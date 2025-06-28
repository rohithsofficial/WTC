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
import { 
  auth, 
  db, 
  signOutUser,
  getUserDocument,
  createUserDocument,
  getCurrentUser,
  serverTimestamp
} from '../../src/firebase/firebase-config';
import QRCode from 'react-native-qrcode-svg';
import type { LoyaltyUser } from '../../src/types/loyalty';
import { MaterialIcons } from '@expo/vector-icons';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

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
      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to view your loyalty QR code');
        router.back();
        return;
      }

      setLoading(true);
      console.log('Loading profile for user:', user.uid);
      
      // Get user data from users collection using native SDK
      try {
        const userData = await getUserDocument(user.uid);
        
        if (userData) {
          console.log('Raw user data from Firestore:', userData);
          
          // Check for different possible field names for loyalty points
          const loyaltyPoints = userData.loyaltyPoints || 
                               userData.loyalty_points || 
                               userData.points || 
                               0;
          
          console.log('Extracted loyalty points:', loyaltyPoints);
          console.log('Field loyaltyPoints:', userData.loyaltyPoints);
          console.log('Field loyalty_points:', userData.loyalty_points);
          console.log('Field points:', userData.points);
          
          const profile: LoyaltyUser = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || userData.displayName || userData.name || 'User',
            loyaltyPoints: loyaltyPoints,
            totalOrders: userData.totalOrders || 0,
            totalSpent: userData.totalSpent || 0,
            isFirstTimeUser: userData.isFirstTimeUser ?? true,
            createdAt: userData.createdAt || new Date() as any,
            updatedAt: userData.updatedAt || new Date() as any
          };
          
          console.log('Final profile object:', profile);
          setLoyaltyProfile(profile);
          setQrToken(generateSecureToken(profile.uid));
        } else {
          console.log('No user document found, creating new profile');
          // Create a new user profile if one doesn't exist
          const newProfile: Omit<LoyaltyUser, 'createdAt' | 'updatedAt'> = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            loyaltyPoints: 0,
            totalOrders: 0,
            totalSpent: 0,
            isFirstTimeUser: true,
          };
          
          // Add the profile to users collection using native SDK
          const createResult = await createUserDocument(user.uid, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          if (createResult.success) {
            console.log('Created new profile:', newProfile);
            // For the local state, we'll use the current timestamp
            const now = new Date();
            const localProfile: LoyaltyUser = {
              ...newProfile,
              createdAt: now as any, // Type assertion for local state
              updatedAt: now as any
            };
            setLoyaltyProfile(localProfile);
            setQrToken(generateSecureToken(localProfile.uid));
          } else {
            throw createResult.error;
          }
        }
      } catch (firestoreError) {
        console.error('Firestore operation error:', firestoreError);
        throw firestoreError;
      }
    } catch (error: unknown) {
  console.error('Error loading loyalty profile:', error);

  if (error instanceof Error) {
    setError('Failed to load loyalty profile: ' + error.message);
  } else {
    setError('Failed to load loyalty profile: Unknown error');
  }
} finally {
  setLoading(false);
}
  };

  const refreshQRCode = async () => {
    if (!loyaltyProfile) return;
    
    setRefreshing(true);
    try {
      console.log('Refreshing QR code and profile data...');
      
      // Generate new token
      setQrToken(generateSecureToken(loyaltyProfile.uid));
      
      // Refresh profile data from database
      await loadLoyaltyProfile();
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      Alert.alert('Error', 'Failed to refresh QR code');
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh function for debugging
  const debugRefresh = async () => {
    console.log('=== DEBUG REFRESH ===');
    const user = getCurrentUser();
    if (!user) return;
    
    try {
      const userData = await getUserDocument(user.uid);
      
      if (userData) {
        console.log('=== FRESH DATA FROM DATABASE ===');
        console.log('Full document:', JSON.stringify(userData, null, 2));
        console.log('loyaltyPoints field:', userData.loyaltyPoints);
        console.log('Type of loyaltyPoints:', typeof userData.loyaltyPoints);
        
        // Show alert with current points from database
        Alert.alert(
          'Debug Info', 
          `DB loyaltyPoints: ${userData.loyaltyPoints}\nType: ${typeof userData.loyaltyPoints}\nAll fields: ${Object.keys(userData).join(', ')}`
        );
      }
    } catch (error: unknown) {
  console.error('Error loading loyalty profile:', error);

  if (error instanceof Error) {
    setError('Failed to load loyalty profile: ' + error.message);
  } else {
    setError('Failed to load loyalty profile: Unknown error');
  }
} finally {
  setLoading(false);
}

    
    // Also refresh the profile
    await loadLoyaltyProfile();
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
      const result = await signOutUser();
      if (result.success) {
        router.replace('/');
      } else {
        throw result.error;
      }
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
            {/* Debug button - remove in production */}
            <TouchableOpacity 
              style={styles.debugButton} 
              onPress={debugRefresh}
            >
              <Text style={styles.debugButtonText}>🔍 Debug Refresh</Text>
            </TouchableOpacity>
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
          <TouchableOpacity style={styles.ActionButton} onPress={() => router.push('LoyaltyScreen')}>
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
  ScrollViewFlex: {
    flexGrow: 1,
  },
  HeaderContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingVertical: SPACING.space_20,
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
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  UserHeaderContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_20,
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
  },
  PointsContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_20,
  },
  PointsCard: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_20,
    alignItems: 'center',
  },
  PointsLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
  },
  PointsValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryOrangeHex,
    marginVertical: SPACING.space_8,
  },
  PointsSubtext: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  debugButton: {
    marginTop: SPACING.space_10,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    backgroundColor: COLORS.primaryGreyHex,
    borderRadius: BORDERRADIUS.radius_8,
  },
  debugButtonText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  QRContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_30,
    alignItems: 'center',
  },
  QRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.space_20,
  },
  QRTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
  },
  RefreshButton: {
    padding: SPACING.space_8,
  },
  QRCodeWrapper: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_20,
  },
  QRInstructions: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    marginBottom: SPACING.space_8,
  },
  QRExpiry: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    textAlign: 'center',
  },
  HowItWorksContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_20,
  },
  HowItWorksTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_20,
  },
  StepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.space_16,
  },
  StepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryOrangeHex,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.space_12,
  },
  StepNumberText: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  StepContent: {
    flex: 1,
  },
  StepTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  StepDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    lineHeight: 20,
  },
  RulesContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_20,
  },
  RulesTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_16,
  },
  RuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  RuleText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    marginLeft: SPACING.space_8,
  },
  ActionsContainer: {
    paddingHorizontal: SPACING.space_30,
    paddingBottom: SPACING.space_30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ActionButton: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_16,
    alignItems: 'center',
    flex: 0.48,
  },
  ActionButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
    paddingHorizontal: SPACING.space_30,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryRedHex,
    textAlign: 'center',
    marginVertical: SPACING.space_20,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_8,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
});

export default LoyaltyQRCodeScreen;