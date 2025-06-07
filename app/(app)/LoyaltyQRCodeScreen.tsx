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
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import { LoyaltyService } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/config';
import { signOut } from 'firebase/auth';
import QRCode from 'react-native-qrcode-svg';
import type { LoyaltyUser } from '../../src/types/loyalty';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

const LoyaltyQRCodeScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLoyaltyProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please sign in to view your loyalty QR code');
        router.back();
        return;
      }

      setLoading(true);
      const profile = await LoyaltyService.getUserProfile(user.uid);
      
      if (profile) {
        setLoyaltyProfile(profile);
      } else {
        // Create a new loyalty profile if one doesn't exist
        const newProfile: LoyaltyUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          loyaltyPoints: 0,
          membershipTier: 'Bronze',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        // Add the profile to Firestore
        const docRef = await addDoc(collection(db, 'loyaltyUsers'), newProfile);
        newProfile.uid = docRef.id;
        setLoyaltyProfile(newProfile);
      }
    } catch (error) {
      console.error('Error loading loyalty profile:', error);
      setError('Failed to load loyalty profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoyaltyProfile();
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
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
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

        {/* QR Code Display */}
        <View style={styles.QRContainer}>
          <QRCode
            value={loyaltyProfile.uid}
            size={200}
            backgroundColor={COLORS.primaryWhiteHex}
            color={COLORS.primaryBlackHex}
          />
          <Text style={styles.QRInstructions}>
            Show this QR code to staff to earn or redeem points
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.UserInfoContainer}>
          <Text style={styles.UserName}>{loyaltyProfile.displayName}</Text>
          <Text style={styles.UserEmail}>{loyaltyProfile.email}</Text>
          <Text style={styles.MembershipTier}>
            {loyaltyProfile.membershipTier} Member
          </Text>
          <Text style={styles.PointsText}>
            {loyaltyProfile.loyaltyPoints} Points
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
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
  QRContainer: {
    alignItems: 'center',
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryGreyHex,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  QRInstructions: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginTop: SPACING.space_15,
  },
  UserInfoContainer: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryGreyHex,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  UserName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_8,
  },
  UserEmail: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryLightGreyHex,
    marginBottom: SPACING.space_15,
  },
  MembershipTier: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_8,
  },
  PointsText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default LoyaltyQRCodeScreen;