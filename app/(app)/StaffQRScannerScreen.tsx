// app/(app)/StaffQRScannerScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { loyaltyService } from '../../src/services/loyaltyService';
import { doc, getDoc, addDoc, collection, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { LOYALTY_CONFIG, TierConfig, MembershipTier } from '../../src/types/loyalty';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RedemptionResult {
  userName: string;
  membershipTier: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  remainingPoints: number;
  pointsEarned: number;
  finalAmount: number;
  error?: string;
}

interface CalculationPreview {
  userName: string;
  currentTier: MembershipTier;
  currentPoints: number;
  orderAmount: number;
  discountAmount: number;
  pointsUsed: number;
  pointsEarned: number;
  finalAmount: number;
  remainingPoints: number;
  newTier: MembershipTier;
  tierUpgraded: boolean;
}

// Correct tier discount calculation based on LOYALTY_CONFIG
const calculateTierDiscount = (orderAmount: number, tier: MembershipTier, currentPoints: number) => {
  const tierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === tier);
  
  if (!tierConfig) {
    return {
      isEligible: false,
      discountAmount: 0,
      pointsRequired: 0,
      reasonNotEligible: 'Invalid tier'
    };
  }

  let discountAmount = 0;
  let pointsRequired = 0;

  switch (tier) {
    case 'Bronze':
      // Bronze: Flat ₹10 or 2% discount (max ₹20) when you have 100+ points
      if (currentPoints < 100) {
        return {
          isEligible: false,
          discountAmount: 0,
          pointsRequired: 0,
          reasonNotEligible: 'Minimum 100 points required for Bronze tier discount'
        };
      }
      const percentageDiscount = orderAmount * 0.02;
      const flatDiscount = 10;
      discountAmount = Math.min(Math.max(percentageDiscount, flatDiscount), tierConfig.maxDiscountPerBill);
      // Points required for this discount (using redemption rate)
      pointsRequired = Math.ceil(discountAmount / LOYALTY_CONFIG.redemptionRate);
      break;

    case 'Silver':
      // Silver: 5% discount (max ₹75)
      discountAmount = Math.min(orderAmount * 0.05, tierConfig.maxDiscountPerBill);
      pointsRequired = Math.ceil(discountAmount / LOYALTY_CONFIG.redemptionRate);
      break;

    case 'Gold':
      // Gold: 10% discount (max ₹150)
      discountAmount = Math.min(orderAmount * 0.10, tierConfig.maxDiscountPerBill);
      pointsRequired = Math.ceil(discountAmount / LOYALTY_CONFIG.redemptionRate);
      break;

    case 'Platinum':
      // Platinum: 15% + ₹50 combo discount (max ₹200)
      const percentageDisc = orderAmount * 0.15;
      const comboDiscount = percentageDisc + 50;
      discountAmount = Math.min(comboDiscount, tierConfig.maxDiscountPerBill);
      pointsRequired = Math.ceil(discountAmount / LOYALTY_CONFIG.redemptionRate);
      break;

    default:
      return {
        isEligible: false,
        discountAmount: 0,
        pointsRequired: 0,
        reasonNotEligible: 'Unknown tier'
      };
  }

  if (currentPoints < pointsRequired) {
    return {
      isEligible: false,
      discountAmount: 0,
      pointsRequired: 0,
      reasonNotEligible: `Insufficient points. Need ${pointsRequired} points for ₹${discountAmount.toFixed(2)} discount`
    };
  }

  return {
    isEligible: true,
    discountAmount: discountAmount,
    pointsRequired: pointsRequired,
    reasonNotEligible: null
  };
};

const StaffQRScannerScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [calculationPreview, setCalculationPreview] = useState<CalculationPreview | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const refreshCamera = () => {
    setCameraKey(prev => prev + 1);
  };

  const validateQRToken = (data: string): string | null => {
    try {
      // Check if it's a JWT token
      if (data.includes('.')) {
        // Simple JWT validation - in production, use proper JWT library
        const parts = data.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.userId && payload.exp > Date.now() / 1000) {
            return payload.userId;
          }
        }
      }
      // Check if it's a direct userId (for testing)
      if (data.length > 10 && data.includes('user_')) {
        return data;
      }
      return null;
    } catch (error) {
      console.error('QR validation error:', error);
      return null;
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    const userId = validateQRToken(data);
    if (!userId) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is invalid or expired. Please ask the customer to refresh their loyalty QR code.',
        [
          { 
            text: 'Scan Again', 
            onPress: () => {
              setScanned(false);
              refreshCamera();
            }
          },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
      return;
    }

    setScannedUserId(userId);
    setShowAmountInput(true);
  };

  const calculatePreview = async () => {
    if (!scannedUserId || !orderAmount) {
      Alert.alert('Error', 'Please enter a valid order amount');
      return;
    }

    const amount = parseFloat(orderAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Order amount must be greater than 0');
      return;
    }

    // Check minimum order amount
    if (amount < LOYALTY_CONFIG.minOrderAmount) {
      Alert.alert('Error', `Minimum order amount is ₹${LOYALTY_CONFIG.minOrderAmount}`);
      return;
    }

    setLoading(true);
    try {
      // Get user's current data
      const userDocRef = doc(db, 'users', scannedUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const currentPoints = userData.loyaltyPoints || 0;
      const membershipTier = userData.membershipTier || 'Bronze';
      const userName = userData.displayName || 'Customer';

      // Calculate tier discount using correct logic
      const tierDiscount = calculateTierDiscount(amount, membershipTier, currentPoints);

      let discountAmount = 0;
      let pointsUsed = 0;

      // Apply discount if eligible
      if (tierDiscount.isEligible) {
        discountAmount = tierDiscount.discountAmount;
        pointsUsed = tierDiscount.pointsRequired || 0;
      }

      // Calculate final amount after discount
      const finalAmount = amount - discountAmount;

      // Get tier config for multiplier
      const tierConfig = LOYALTY_CONFIG.tiers.find(t => t.name === membershipTier);
      const multiplier = tierConfig?.pointMultiplier || 1;

      // Calculate points earned on ORIGINAL amount (before discount) with multiplier
      const basePointsEarned = Math.floor(amount * LOYALTY_CONFIG.pointsPerRupee);
      const pointsEarned = Math.floor(basePointsEarned * multiplier);

      // Calculate remaining points after transaction
      const remainingPoints = Math.max(0, currentPoints + pointsEarned - pointsUsed);

      // Determine new tier based on remaining points
      const newTier = LOYALTY_CONFIG.tiers
        .sort((a: TierConfig, b: TierConfig) => b.minPoints - a.minPoints)
        .find((tier: TierConfig) => remainingPoints >= tier.minPoints)?.name || 'Bronze' as MembershipTier;

      const tierUpgraded = newTier !== membershipTier;

      setCalculationPreview({
        userName,
        currentTier: membershipTier,
        currentPoints,
        orderAmount: amount,
        discountAmount,
        pointsUsed,
        pointsEarned,
        finalAmount,
        remainingPoints,
        newTier,
        tierUpgraded
      });

      setShowConfirmation(true);

    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to calculate preview'
      );
    } finally {
      setLoading(false);
    }
  };

  const createOfflineOrder = async (
    userId: string,
    amount: number,
    finalAmount: number,
    discountAmount: number,
    pointsEarned: number,
    pointsUsed: number,
    userName: string
  ) => {
    try {
      const currentDate = new Date();
      const orderData = {
        createdAt: currentDate,
        discountAmount: discountAmount,
        displayName: userName,
        finalAmount: finalAmount,
        items: [
          {
            id: "offline_item",
            imagelink_square: "",
            name: "Staff Transaction",
            price: amount,
            quantity: 1,
            roasted: "",
            size: "Regular",
            special_ingredient: ""
          }
        ],
        orderDate: currentDate.toISOString().split('T')[0],
        orderStatus: "Completed",
        orderType: "offline",
        paymentMethod: "cash",
        paymentMode: "cash",
        paymentStatus: "paid",
        pointsEarned: pointsEarned,
        pointsRedeemed: pointsUsed,
        status: "Completed",
        tableNumber: "",
        timestamp: currentDate,
        totalAmount: amount,
        type: "offline",
        updatedAt: currentDate,
        userId: userId
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      return orderRef.id;
    } catch (error) {
      console.error('Error creating offline order:', error);
      throw error;
    }
  };

  const updateUserProfile = async (
    userId: string,
    amount: number,
    discountAmount: number,
    pointsUsed: number,
    pointsEarned: number,
    orderId: string,
    remainingPoints: number,
    newTier: MembershipTier
  ) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const currentDate = Timestamp.now();
      
      const transaction = {
        amount: amount,
        date: currentDate,
        description: `Staff Transaction of ₹${amount.toFixed(2)} - Earned ${pointsEarned} points${pointsUsed > 0 ? ` - Redeemed ${pointsUsed} points` : ''}`,
        orderId: orderId,
        pointsEarned: pointsEarned,
        pointsRedeemed: pointsUsed,
        type: "offline"
      };

      await updateDoc(userDocRef, {
        orderCount: increment(1),
        totalOrders: increment(1),
        totalSpent: increment(amount),
        loyaltyPoints: remainingPoints,
        membershipTier: newTier,
        totalPoints: increment(pointsEarned - pointsUsed),
        transactions: arrayUnion(transaction),
        updatedAt: currentDate
      });

    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const processConfirmedTransaction = async () => {
    if (!calculationPreview || !scannedUserId) return;

    setLoading(true);
    try {
      // Create offline order
      const orderId = await createOfflineOrder(
        scannedUserId,
        calculationPreview.orderAmount,
        calculationPreview.finalAmount,
        calculationPreview.discountAmount,
        calculationPreview.pointsEarned,
        calculationPreview.pointsUsed,
        calculationPreview.userName
      );

      // Update user profile
      await updateUserProfile(
        scannedUserId,
        calculationPreview.orderAmount,
        calculationPreview.discountAmount,
        calculationPreview.pointsUsed,
        calculationPreview.pointsEarned,
        orderId,
        calculationPreview.remainingPoints,
        calculationPreview.newTier
      );

      // Process loyalty service transaction
      await LoyaltyService.processStaffTransaction(
        scannedUserId,
        calculationPreview.orderAmount,
        calculationPreview.discountAmount,
        calculationPreview.pointsUsed,
        calculationPreview.pointsEarned,
        calculationPreview.currentTier
      );

      // If tier upgraded, create tier upgrade transaction
      if (calculationPreview.tierUpgraded) {
        const tierUpgradeTransaction = {
          userId: scannedUserId,
          points: 0,
          type: 'bonus',
          description: `Congratulations! You've been upgraded to ${calculationPreview.newTier} tier!`,
          timestamp: Timestamp.now()
        };
        
        await addDoc(collection(db, 'loyaltyTransactions'), tierUpgradeTransaction);
      }

      setRedemptionResult({
        userName: calculationPreview.userName,
        membershipTier: calculationPreview.newTier,
        orderAmount: calculationPreview.orderAmount,
        discountApplied: calculationPreview.discountAmount,
        pointsUsed: calculationPreview.pointsUsed,
        remainingPoints: calculationPreview.remainingPoints,
        pointsEarned: calculationPreview.pointsEarned,
        finalAmount: calculationPreview.finalAmount
      });

      setShowConfirmation(false);

    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert(
        'Transaction Failed',
        error instanceof Error ? error.message : 'Failed to process transaction'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedUserId(null);
    setOrderAmount('');
    setRedemptionResult(null);
    setShowAmountInput(false);
    setShowConfirmation(false);
    setCalculationPreview(null);
    refreshCamera();
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff QR Scanner</Text>
        {(showAmountInput || showConfirmation || redemptionResult) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <MaterialIcons name="refresh" size={24} color={COLORS.primaryOrangeHex} />
          </TouchableOpacity>
        )}
      </View>
      
      {!showAmountInput && !showConfirmation && !redemptionResult && (
        <View style={styles.cameraContainer}>
          <CameraView
            key={cameraKey}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'pdf417'],
            }}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
            <Text style={styles.scanInstruction}>
              Scan customer's loyalty QR code
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshCamera}
          >
            <MaterialIcons name="refresh" size={24} color={COLORS.primaryWhiteHex} />
          </TouchableOpacity>
        </View>
      )}

      {showAmountInput && !showConfirmation && !redemptionResult && (
        <ScrollView style={styles.inputContainer}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter Order Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={orderAmount}
                onChangeText={setOrderAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.processButton, loading && styles.disabledButton]}
              onPress={calculatePreview}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.processButtonText}>Calculate & Preview</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {showConfirmation && calculationPreview && (
        <ScrollView style={styles.confirmationContainer}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Confirm Transaction</Text>
            
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{calculationPreview.userName}</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{calculationPreview.currentTier} Member</Text>
              </View>
              <Text style={styles.currentPoints}>Current Points: {calculationPreview.currentPoints}</Text>
            </View>

            <View style={styles.calculationDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Amount:</Text>
                <Text style={styles.detailValue}>₹{calculationPreview.orderAmount.toFixed(2)}</Text>
              </View>
              
              {calculationPreview.discountAmount > 0 && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tier Discount:</Text>
                    <Text style={[styles.detailValue, styles.discountValue]}>
                      -₹{calculationPreview.discountAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points Used:</Text>
                    <Text style={styles.detailValue}>{calculationPreview.pointsUsed}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points Earned:</Text>
                <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                  +{calculationPreview.pointsEarned}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining Points:</Text>
                <Text style={styles.detailValue}>{calculationPreview.remainingPoints}</Text>
              </View>

              {calculationPreview.tierUpgraded && (
                <View style={styles.tierUpgradeNotice}>
                  <MaterialIcons name="upgrade" size={20} color="#4CAF50" />
                  <Text style={styles.tierUpgradeText}>
                    Tier Upgrade: {calculationPreview.currentTier} → {calculationPreview.newTier}
                  </Text>
                </View>
              )}
              
              <View style={styles.divider} />
              <View style={styles.finalAmountRow}>
                <Text style={styles.finalAmountLabel}>Final Amount:</Text>
                <Text style={styles.finalAmountValue}>
                  ₹{calculationPreview.finalAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={processConfirmedTransaction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.primaryWhiteHex} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Transaction</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {redemptionResult && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.resultCard}>
            {redemptionResult.error ? (
              <View style={styles.errorResult}>
                <MaterialIcons name="error" size={48} color={COLORS.primaryRedHex} />
                <Text style={styles.errorText}>{redemptionResult.error}</Text>
              </View>
            ) : (
              <View style={styles.successResult}>
                <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
                <Text style={styles.successTitle}>Transaction Successful!</Text>
                
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{redemptionResult.userName}</Text>
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierText}>{redemptionResult.membershipTier} Member</Text>
                  </View>
                </View>

                <View style={styles.transactionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Amount:</Text>
                    <Text style={styles.detailValue}>₹{redemptionResult.orderAmount.toFixed(2)}</Text>
                  </View>
                  {redemptionResult.discountApplied > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Discount Applied:</Text>
                      <Text style={[styles.detailValue, styles.discountValue]}>
                        -₹{redemptionResult.discountApplied.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {redemptionResult.pointsUsed > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Points Used:</Text>
                      <Text style={styles.detailValue}>{redemptionResult.pointsUsed}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points Earned:</Text>
                    <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                      +{redemptionResult.pointsEarned}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remaining Points:</Text>
                    <Text style={styles.detailValue}>{redemptionResult.remainingPoints}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.finalAmountRow}>
                    <Text style={styles.finalAmountLabel}>Final Amount:</Text>
                    <Text style={styles.finalAmountValue}>
                      ₹{redemptionResult.finalAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.newScanButton} onPress={resetScanner}>
              <Text style={styles.newScanButtonText}>New Customer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showAmountInput && !showConfirmation && !redemptionResult && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Ask customer to show their loyalty QR code
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => {
                setScanned(false);
                refreshCamera();
              }}
            >
              <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

// Add the missing styles for new components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_15,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerTitle: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  resetButton: {
    padding: SPACING.space_8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_20,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    marginTop: SPACING.space_20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_10,
  },
  refreshButton: {
    position: 'absolute',
    bottom: SPACING.space_30,
    right: SPACING.space_30,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_25,
    padding: SPACING.space_15,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  inputSection: {
    padding: SPACING.space_20,
  },
  inputLabel: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_15,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: BORDERRADIUS.radius_15,
    paddingHorizontal: SPACING.space_20,
    marginBottom: SPACING.space_24,
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
  },
  currencySymbol: {
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginRight: SPACING.space_10,
  },
  amountInput: {
    flex: 1,
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryBlackHex,
    paddingVertical: SPACING.space_15,
  },
  processButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  processButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  resultCard: {
    margin: SPACING.space_20,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorResult: {
    alignItems: 'center',
    paddingVertical: SPACING.space_24,
  },
  errorText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryRedHex,
    textAlign: 'center',
    marginTop: SPACING.space_15,
  },
  successResult: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: '#4CAF50',
    marginTop: SPACING.space_10,
    marginBottom: SPACING.space_20,
  },
  customerInfo: {
    alignItems: 'center',
    marginBottom: SPACING.space_24,
  },
  customerName: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  tierBadge: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
  },
  tierText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryWhiteHex,
  },
  transactionDetails: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_8,
  },
  detailLabel: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryBlackHex,
  },
  detailValue: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  discountValue: {
    color: '#4CAF50',
  },
  pointsEarnedValue: {
    color: COLORS.primaryOrangeHex,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: SPACING.space_15,
  },
  finalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_10,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_10,
  },
  finalAmountLabel: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  finalAmountValue: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryOrangeHex,
  },
  newScanButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginTop: SPACING.space_24,
  },
  newScanButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  instructions: {
    padding: SPACING.space_20,
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
  },
  instructionText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: SPACING.space_10,
  },
  scanAgainButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_10,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_10,
  },
  scanAgainText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  text: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  button: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_30,
    borderRadius: BORDERRADIUS.radius_15,
    alignSelf: 'center',
  },
  buttonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  refreshButton: {
    position: 'absolute',
    top: SPACING.space_20,
    right: SPACING.space_20,
    backgroundColor: COLORS.primaryOrangeHex,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default StaffQRScannerScreen;