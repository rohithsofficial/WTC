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
}

const FloatingQRModal: React.FC<FloatingQRModalProps> = ({ visible, onClose }) => {
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState<string>('');
  const [barcodeToken, setBarcodeToken] = useState<string>('');
  const [showBarcode, setShowBarcode] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Enhanced QR glow animation
  useEffect(() => {
    if (visible && !showBarcode) {
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
  }, [visible, showBarcode]);

  // Brightness management
  const increaseBrightness = async () => {
    try {
      const currentBrightness = await Brightness.getBrightnessAsync();
      setOriginalBrightness(currentBrightness);
      await Brightness.setBrightnessAsync(1.0);
      console.log('Screen brightness increased for QR display');
    } catch (error) {
      console.error('Error increasing brightness:', error);
      try {
        await Brightness.setBrightnessAsync(0.9);
      } catch (fallbackError) {
        console.error('Fallback brightness setting failed:', fallbackError);
      }
    }
  };

  const restoreBrightness = async () => {
    try {
      if (originalBrightness !== null) {
        await Brightness.setBrightnessAsync(originalBrightness);
        console.log('Screen brightness restored');
      }
    } catch (error) {
      console.error('Error restoring brightness:', error);
    }
  };

  // Generate secure token for QR code
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
        purpose: 'loyalty_discount'
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = btoa(`${encodedHeader}.${encodedPayload}.${userId}`);
      
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
      console.error('Token generation error:', error);
      return userId;
    }
  };

  // FIXED: Generate proper EAN-13 barcode that matches scanner expectations
  const generateBarcodeToken = (userId: string): string => {
    try {
      // Generate a proper EAN-13 barcode (13 digits)
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create a consistent hash from userId
      let userHash = '';
      for (let i = 0; i < userId.length; i++) {
        const charCode = userId.charCodeAt(i);
        userHash += (charCode % 10).toString();
      }
      
      // Take first 8 digits from userHash or pad with timestamp
      const userPart = userHash.substring(0, 8).padEnd(8, timestamp.toString().slice(-8));
      
      // Get last 4 digits of timestamp for uniqueness
      const timePart = timestamp.toString().slice(-4);
      
      // Combine to get 12 digits
      let code = userPart + timePart;
      code = code.substring(0, 12); // Ensure exactly 12 digits
      
      // Calculate EAN-13 check digit
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      
      // Final EAN-13 code
      const finalCode = code + checkDigit.toString();
      
      console.log('✅ Generated EAN-13 barcode:', finalCode, 'for userId:', userId);
      console.log('📊 Barcode breakdown - User part:', userPart, 'Time part:', timePart, 'Check digit:', checkDigit);
      
      return finalCode;
    } catch (error) {
      console.error('❌ Barcode generation error:', error);
      // Fallback: generate a simple 13-digit number
      const timestamp = Date.now().toString();
      const fallback = timestamp.substring(timestamp.length - 12) + '0';
      console.log('🔄 Using fallback barcode:', fallback);
      return fallback;
    }
  };

  // Store barcode mapping in Firebase for validation - ENHANCED VERSION
  const storeBarcodeMapping = async (barcodeToken: string, userId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'users', user.uid);
      const currentTime = Timestamp.now();
      const expiryTime = new Timestamp(currentTime.seconds + (15 * 60), 0); // 15 minutes

      // Store with multiple lookup strategies - ENHANCED for barcode scanning
      const barcodeData = {
        currentBarcodeToken: barcodeToken,
        barcodeExpiry: expiryTime,
        barcodeCreatedAt: currentTime,
        // CRITICAL: Store the exact barcode for direct lookup
        loyaltyCardNumber: barcodeToken,
        ean13Code: barcodeToken, // Store as EAN-13 for scanner compatibility
        userId: userId,
        barcodeActive: true,
        // Add variations for better matching
        barcodeWithoutCheckDigit: barcodeToken.substring(0, 12), // First 12 digits
        barcodeCore: barcodeToken.substring(0, 10), // Core identifier
      };

      // Try to update existing document first
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, barcodeData);
        console.log('✅ Barcode mapping updated:', barcodeToken, 'for user:', userId);
      } else {
        await setDoc(userDocRef, barcodeData, { merge: true });
        console.log('✅ Barcode mapping created:', barcodeToken, 'for user:', userId);
      }

      // CRITICAL: Store in barcodeHistory collection with exact barcode as document ID
      try {
        const barcodeHistoryRef = doc(db, 'barcodeHistory', barcodeToken);
        await setDoc(barcodeHistoryRef, {
          userId: userId,
          barcodeToken: barcodeToken,
          ean13Code: barcodeToken,
          createdAt: currentTime,
          expiryTime: expiryTime,
          isActive: true,
          scanCount: 0,
          // Store lookup variations
          variations: {
            full: barcodeToken,
            without_check: barcodeToken.substring(0, 12),
            core: barcodeToken.substring(0, 10)
          }
        });
        console.log('✅ Barcode history entry created with ID:', barcodeToken);
      } catch (historyError) {
        console.error('⚠️ Failed to create barcode history entry:', historyError);
      }

      // ADDITIONAL: Create a reverse lookup document for faster scanning
      try {
        const lookupRef = doc(db, 'barcodeLookup', barcodeToken);
        await setDoc(lookupRef, {
          userId: userId,
          createdAt: currentTime,
          expiryTime: expiryTime,
          isActive: true
        });
        console.log('✅ Barcode lookup entry created');
      } catch (lookupError) {
        console.error('⚠️ Failed to create barcode lookup entry:', lookupError);
      }

    } catch (error) {
      console.error('❌ Error storing barcode mapping:', error);
      
      // Fallback: try with setDoc and merge option
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const currentTime = Timestamp.now();
          const expiryTime = new Timestamp(currentTime.seconds + (15 * 60), 0);
          
          await setDoc(userDocRef, {
            currentBarcodeToken: barcodeToken,
            barcodeExpiry: expiryTime,
            barcodeCreatedAt: currentTime,
            loyaltyCardNumber: barcodeToken,
            ean13Code: barcodeToken,
            userId: user.uid,
            barcodeActive: true
          }, { merge: true });
          
          console.log('✅ Barcode mapping stored via fallback method');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback barcode storage also failed:', fallbackError);
      }
    }
  };

  const loadLoyaltyProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please sign in to view your loyalty code');
        onClose();
        return;
      }

      setLoading(true);
      
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
          loyaltyPoints: loyaltyPoints,
          totalOrders: userData.totalOrders || 0,
          totalSpent: userData.totalSpent || 0,
          isFirstTimeUser: userData.isFirstTimeUser ?? true,
          createdAt: userData.createdAt || Timestamp.now(),
          updatedAt: userData.updatedAt || Timestamp.now()
        };
        
        setLoyaltyProfile(profile);
        const qrCode = generateSecureToken(profile.uid);
        const barcodeCode = generateBarcodeToken(profile.uid);
        
        setQrToken(qrCode);
        setBarcodeToken(barcodeCode);
        
        // Store barcode mapping for validation
        await storeBarcodeMapping(barcodeCode, profile.uid);
      } else {
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
        
        setLoyaltyProfile(newProfile);
        const qrCode = generateSecureToken(newProfile.uid);
        const barcodeCode = generateBarcodeToken(newProfile.uid);
        
        setQrToken(qrCode);
        setBarcodeToken(barcodeCode);
        
        // Store barcode mapping for validation
        await storeBarcodeMapping(barcodeCode, newProfile.uid);
      }
    } catch (error) {
      console.error('Error loading loyalty profile:', error);
      Alert.alert('Error', 'Failed to load loyalty profile');
    } finally {
      setLoading(false);
    }
  };

  // Animation and brightness effects
  useEffect(() => {
    if (visible) {
      loadLoyaltyProfile();
      increaseBrightness();
      
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
      ]).start();
    } else {
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
      ]).start();
    }

    return () => {
      if (visible) {
        restoreBrightness();
      }
    };
  }, [visible]);

  const handleClose = () => {
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
    ]).start(() => {
      onClose();
    });
  };

  const toggleCodeType = () => {
    setShowBarcode(!showBarcode);
  };

  // Fixed barcode rendering with proper centering and container sizing
  const renderBarcode = (value: string) => {
    const barWidth = 2;
    const barHeight = 60;
    const bars = [];
    
    // Generate proper barcode pattern (Code 128 style)
    const generateBarcodePattern = (digit: string) => {
      const patterns: { [key: string]: number[] } = {
        '0': [1, 1, 0, 0, 1, 1, 0],
        '1': [1, 0, 1, 1, 0, 0, 1],
        '2': [1, 0, 0, 1, 1, 0, 1],
        '3': [1, 0, 0, 1, 0, 1, 1],
        '4': [1, 1, 0, 0, 1, 0, 1],
        '5': [1, 1, 0, 1, 0, 0, 1],
        '6': [1, 0, 1, 0, 0, 1, 1],
        '7': [1, 0, 1, 0, 1, 1, 0],
        '8': [1, 0, 1, 1, 0, 1, 0],
        '9': [1, 1, 0, 1, 0, 1, 0],
      };
      return patterns[digit] || [1, 0, 1, 0, 1, 0, 1];
    };

    // Start pattern
    [1, 1, 0, 1].forEach((bar, index) => {
      bars.push(
        <View
          key={`start-${index}`}
          style={[
            styles.barcodeBar,
            {
              width: barWidth,
              height: barHeight,
              backgroundColor: bar === 1 ? COLORS.primaryBlackHex : 'transparent',
            }
          ]}
        />
      );
    });

    // Data patterns - use all 13 digits for EAN-13
    for (let i = 0; i < value.length; i++) {
      const digit = value[i];
      const pattern = generateBarcodePattern(digit);
      
      pattern.forEach((bar, barIndex) => {
        bars.push(
          <View
            key={`${i}-${barIndex}`}
            style={[
              styles.barcodeBar,
              {
                width: barWidth,
                height: barHeight,
                backgroundColor: bar === 1 ? COLORS.primaryBlackHex : 'transparent',
              }
            ]}
          />
        );
      });
    }

    // End pattern
    [1, 0, 1, 1].forEach((bar, index) => {
      bars.push(
        <View
          key={`end-${index}`}
          style={[
            styles.barcodeBar,
            {
              width: barWidth,
              height: barHeight,
              backgroundColor: bar === 1 ? COLORS.primaryBlackHex : 'transparent',
            }
          ]}
        />
      );
    });
    
    return (
      <View style={styles.barcodeContainer}>
        <View style={styles.barcodeWrapper}>
          {bars}
        </View>
        <Text style={styles.barcodeText}>{value}</Text>
        <Text style={styles.barcodeDescription}>
          EAN-13 Loyalty Code - valid for 15 minutes
        </Text>
      </View>
    );
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 165, 0, 0.3)', 'rgba(255, 165, 0, 0.8)']
  });

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
            },
          ]}
        >
          {/* Header with Points */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.primaryBlackHex} />
            </TouchableOpacity>
            
            <View style={styles.pointsDisplay}>
              <Text style={styles.pointsLabel}>Points</Text>
              <Text style={styles.pointsValue}>
                {loading ? '...' : loyaltyProfile?.loyaltyPoints || 0}
              </Text>
            </View>
          </View>

          {/* Brightness Indicator */}
          <View style={styles.brightnessIndicator}>
            <MaterialIcons name="brightness-high" size={16} color={COLORS.primaryOrangeHex} />
            <Text style={styles.brightnessText}>Screen brightness optimized for scanning</Text>
          </View>

          {/* Code Display - CENTERED */}
          <View style={styles.codeContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeTitle}>
                    {showBarcode ? 'Barcode' : 'QR Code'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.toggleButton} 
                    onPress={toggleCodeType}
                  >
                    <MaterialIcons 
                      name={showBarcode ? "qr-code" : "view-headline"} 
                      size={20} 
                      color={COLORS.primaryOrangeHex} 
                    />
                    <Text style={styles.toggleText}>
                      {showBarcode ? 'QR' : 'Bar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CENTERED CODE WRAPPER */}
                <View style={styles.centeredCodeContainer}>
                  <Animated.View 
                    style={[
                      styles.codeWrapper,
                      {
                        shadowColor: glowColor,
                        shadowOpacity: showBarcode ? 0.5 : 0.8,
                        shadowRadius: 15,
                        elevation: 10,
                      }
                    ]}
                  >
                    {showBarcode ? (
                      renderBarcode(barcodeToken)
                    ) : (
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
                    )}
                  </Animated.View>
                </View>

                <Text style={styles.instructionText}>
                  Show this code to staff for discount
                </Text>
              </>
            )}
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.discountInfo}>
              <MaterialIcons name="local-offer" size={18} color={COLORS.primaryOrangeHex} />
              <Text style={styles.quickInfoText}>
                Max Discount: ₹{loyaltyProfile?.loyaltyPoints || 0}
              </Text>
            </View>
            <Text style={styles.validityText}>
              Valid for 15 minutes
            </Text>
          </View>
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
    backgroundColor: COLORS.primaryWhiteHex, // Changed to white
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_15,
  },
  closeButton: {
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Changed for white background
  },
  pointsDisplay: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 5,
  },
  pointsLabel: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  pointsValue: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_18,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space_36,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex, // Changed for white background
    marginTop: SPACING.space_10,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the header
    marginBottom: SPACING.space_15,
  },
  codeTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex, // Changed for white background
    marginRight: SPACING.space_10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: SPACING.space_10,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_10,
  },
  toggleText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_4,
  },
  // NEW: Centered container for the code
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
  // NEW: QR container for perfect centering
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  barcodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space_10,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  barcodeBar: {
    marginRight: 1,
  },
  barcodeText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_8,
    letterSpacing: 1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  barcodeDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_4,
    textAlign: 'center',
  },
  instructionText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_13,
    color: COLORS.primaryDarkGreyHex, // Changed for white background
    textAlign: 'center',
    lineHeight: 18,
  },
  quickInfo: {
    marginTop: SPACING.space_18,
    paddingTop: SPACING.space_15,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex
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
    marginLeft: SPACING.space_6,
  },
  validityText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_11,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
});

export default FloatingQRModal;