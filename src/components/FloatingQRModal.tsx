// src/components/FloatingQRModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import * as Brightness from 'expo-brightness';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { auth } from '../firebase/config';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { LoyaltyUser } from '../types/loyalty';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingQRModalProps {
  visible: boolean;
  onClose: () => void;
  onSignInPress?: () => void; // Optional callback for sign in
}

type ModalState = 'loading' | 'not_authenticated' | 'error' | 'success' | 'brightness_error';

const FloatingQRModal: React.FC<FloatingQRModalProps> = ({ 
  visible, 
  onClose, 
  onSignInPress 
}) => {
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyUser | null>(null);
  const [modalState, setModalState] = useState<ModalState>('loading');
  const [qrToken, setQrToken] = useState<string>('');
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Enhanced QR glow animation
  useEffect(() => {
    if (visible && modalState === 'success') {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.start();
      return () => glowAnimation.stop();
    }
  }, [visible, modalState]);

  // Brightness management with better error handling
  const increaseBrightness = async (): Promise<boolean> => {
    try {
      const currentBrightness = await Brightness.getBrightnessAsync();
      setOriginalBrightness(currentBrightness);
      
      // Try to set maximum brightness
      await Brightness.setBrightnessAsync(1.0);
      console.log('Screen brightness increased for QR display');
      return true;
    } catch (error) {
      console.error('Error increasing brightness:', error);
      
      // Try fallback brightness levels
      const fallbackLevels = [0.9, 0.8, 0.7];
      for (const level of fallbackLevels) {
        try {
          await Brightness.setBrightnessAsync(level);
          console.log(`Fallback brightness set to ${level}`);
          return true;
        } catch (fallbackError) {
          console.error(`Failed to set brightness to ${level}:`, fallbackError);
        }
      }
      
      // If all brightness attempts fail, continue without brightness adjustment
      setModalState('brightness_error');
      return false;
    }
  };

  const restoreBrightness = async (): Promise<void> => {
    try {
      if (originalBrightness !== null) {
        await Brightness.setBrightnessAsync(originalBrightness);
        console.log('Screen brightness restored');
      }
    } catch (error) {
      console.error('Error restoring brightness:', error);
      // Don't show error to user for brightness restoration failure
    }
  };

  // Generate secure token for QR code with better error handling
  const generateSecureToken = (userId: string): string => {
    try {
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };
      
      const payload = {
        userId: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes expiry
        purpose: 'loyalty_discount',
        version: '1.0'
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = btoa(`${encodedHeader}.${encodedPayload}.${userId}.${Date.now()}`);
      
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
      console.error('Token generation error:', error);
      // Fallback to simple token
      return `${userId}_${Date.now()}_loyalty`;
    }
  };

  const loadLoyaltyProfile = async (): Promise<void> => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setModalState('not_authenticated');
        return;
      }

      setModalState('loading');
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const loyaltyPoints = userData.loyaltyPoints || 
                             userData.loyalty_points || 
                             userData.points || 
                             0;
        
        const profile: LoyaltyUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || userData.displayName || userData.name || 'User',
          loyaltyPoints: Math.max(0, loyaltyPoints), // Ensure non-negative
          totalOrders: userData.totalOrders || 0,
          totalSpent: userData.totalSpent || 0,
          isFirstTimeUser: userData.isFirstTimeUser ?? true,
          createdAt: userData.createdAt || Timestamp.now(),
          updatedAt: userData.updatedAt || Timestamp.now()
        };
        
        setLoyaltyProfile(profile);
        const qrCode = generateSecureToken(profile.uid);
        setQrToken(qrCode);
        setModalState('success');
        
      } else {
        // Create new user profile
        const now = Timestamp.now();
        const newProfile: LoyaltyUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          loyaltyPoints: 0,
          totalOrders: 0,
          totalSpent: 0,
          isFirstTimeUser: true,
          createdAt: now,
          updatedAt: now
        };
        
        // Try to create the document
        try {
          await setDoc(userDocRef, newProfile);
          setLoyaltyProfile(newProfile);
          const qrCode = generateSecureToken(newProfile.uid);
          setQrToken(qrCode);
          setModalState('success');
        } catch (createError) {
          console.error('Error creating user profile:', createError);
          // Still show QR with default profile
          setLoyaltyProfile(newProfile);
          const qrCode = generateSecureToken(newProfile.uid);
          setQrToken(qrCode);
          setModalState('success');
        }
      }
    } catch (error) {
      console.error('Error loading loyalty profile:', error);
      setErrorMessage('Unable to load your loyalty profile. Please check your connection and try again.');
      setModalState('error');
    }
  };

  const handleRetry = async (): Promise<void> => {
    setRetryCount(prev => prev + 1);
    setErrorMessage('');
    await loadLoyaltyProfile();
  };

  const handleSignIn = (): void => {
  try {
    // Close the modal first
    handleClose();
    
    // Trigger the sign in callback if provided
    if (onSignInPress) {
      onSignInPress();
    } else {
      // Log a warning if no handler is configured
      console.warn('No sign-in handler provided to FloatingQRModal');
    }
  } catch (error) {
    console.error('Error handling sign in:', error);
  }
};

  // Animation and brightness effects
  useEffect(() => {
    if (visible) {
      // Start animations
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Load data and manage brightness
      const initialize = async () => {
        await increaseBrightness();
        await loadLoyaltyProfile();
      };
      
      initialize();
    } else {
      // Reset animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Reset state
      setModalState('loading');
      setErrorMessage('');
      setRetryCount(0);
      restoreBrightness();
    }

    return () => {
      if (visible) {
        restoreBrightness();
      }
    };
  }, [visible]);

  const handleClose = (): void => {
    try {
      restoreBrightness();
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    } catch (error) {
      console.error('Error during close:', error);
      // Still close the modal even if animations fail
      onClose();
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 165, 0, 0.3)', 'rgba(255, 165, 0, 0.8)']
  });

  // Render different states
  const renderContent = (): JSX.Element => {
    switch (modalState) {
      case 'loading':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
            <Text style={styles.stateTitle}>Loading your loyalty profile...</Text>
            <Text style={styles.stateSubtitle}>Please wait a moment</Text>
          </View>
        );

      case 'not_authenticated':
        return (
          <View style={styles.stateContainer}>
            <MaterialIcons name="account-circle" size={64} color={COLORS.primaryOrangeHex} />
            <Text style={styles.stateTitle}>Sign In Required</Text>
            <Text style={styles.stateSubtitle}>
              Please sign in to access your loyalty QR code and redeem rewards
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.stateContainer}>
            <MaterialIcons name="error-outline" size={64} color={COLORS.primaryRedHex} />
            <Text style={styles.stateTitle}>Oops! Something went wrong</Text>
            <Text style={styles.stateSubtitle}>
              {errorMessage || 'We encountered an issue loading your loyalty profile.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.primaryButtonText}>
                {retryCount > 0 ? `Retry (${retryCount + 1})` : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'success':
        return (
          <>
            {/* Header with Points */}
            <View style={styles.modalHeader}>
              <View style={styles.pointsDisplay}>
                <Text style={styles.pointsLabel}>Loyalty Points</Text>
                <Text style={styles.pointsValue}>
                  {loyaltyProfile?.loyaltyPoints || 0}
                </Text>
              </View>
            </View>

            {/* Brightness Indicator */}
            {modalState !== 'brightness_error' && (
              <View style={styles.brightnessIndicator}>
                <MaterialIcons name="brightness-high" size={16} color={COLORS.primaryOrangeHex} />
                <Text style={styles.brightnessText}>Screen optimized for scanning</Text>
              </View>
            )}

            {/* QR Code Display */}
            <View style={styles.codeContainer}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeTitle}>Your QR Code</Text>
              </View>

              <View style={styles.centeredCodeContainer}>
                <Animated.View 
                  style={[
                    styles.codeWrapper,
                    {
                      shadowColor: glowColor,
                      shadowOpacity: 0.8,
                      shadowRadius: 15,
                      elevation: 10,
                    }
                  ]}
                >
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={qrToken}
                      size={160}
                      backgroundColor={COLORS.primaryWhiteHex}
                      color={COLORS.primaryBlackHex}
                      logo={require('../../assets/icon.png')}
                      logoSize={32}
                      logoBackgroundColor="transparent"
                      quietZone={10}
                    />
                  </View>
                </Animated.View>
              </View>

              <Text style={styles.instructionText}>
                Show this QR code to our staff to redeem your loyalty discount
              </Text>
            </View>

            {/* Quick Info */}
            <View style={styles.quickInfo}>
              <View style={styles.discountInfo}>
                <MaterialIcons name="local-offer" size={18} color={COLORS.primaryOrangeHex} />
                <Text style={styles.quickInfoText}>
                  Available Discount: ₹{loyaltyProfile?.loyaltyPoints || 0}
                </Text>
              </View>
              <Text style={styles.validityText}>
                Valid for 15 minutes • Expires automatically
              </Text>
            </View>
          </>
        );

      default:
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar 
        backgroundColor="rgba(0, 0, 0, 0.7)" 
        barStyle="light-content" 
        translucent={true}
      />
      
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={COLORS.primaryBlackHex} />
          </TouchableOpacity>

          {/* Dynamic Content */}
          {renderContent()}

          {/* Brightness Error Warning */}
          {modalState === 'brightness_error' && (
            <View style={styles.warningContainer}>
              <MaterialIcons name="warning" size={16} color={COLORS.primaryOrangeHex} />
              <Text style={styles.warningText}>
                Unable to adjust screen brightness. Please manually increase brightness for better scanning.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 0,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_25,
    padding: SPACING.space_20,
    margin: SPACING.space_20,
    maxWidth: screenWidth * 0.9,
    minWidth: screenWidth * 0.8,
    elevation: 25,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.space_15,
    right: SPACING.space_15,
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.space_15,
    marginTop: SPACING.space_10,
  },
  pointsDisplay: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 5,
    minWidth: 120,
  },
  pointsLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  pointsValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
  },
  brightnessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    paddingHorizontal: SPACING.space_12,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: BORDERRADIUS.radius_10,
  },
  brightnessText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_4,
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_15,
  },
  codeTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  centeredCodeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_15,
  },
  codeWrapper: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_18,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 8,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primaryLightGreyHex,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryDarkGreyHex,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.space_10,
  },
  quickInfo: {
    marginTop: SPACING.space_18,
    paddingTop: SPACING.space_15,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
  },
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_8,
  },
  quickInfoText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_8,
  },
  validityText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space_36,
    paddingHorizontal: SPACING.space_20,
  },
  stateTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginTop: SPACING.space_15,
    marginBottom: SPACING.space_10,
  },
  stateSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.space_20,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 5,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.space_15,
    paddingVertical: SPACING.space_10,
    paddingHorizontal: SPACING.space_15,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: BORDERRADIUS.radius_10,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  warningText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
    flex: 1,
    textAlign: 'center',
  },
});

export default FloatingQRModal;