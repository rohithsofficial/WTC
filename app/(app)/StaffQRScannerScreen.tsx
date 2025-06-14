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
import { doc, getDoc, addDoc, collection, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { loyaltyService, ComprehensiveLoyaltyTransaction } from '../../src/services/loyaltyService';
import { OrderData } from '../../src/types/offlineOrderData';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CustomerData {
  displayName: string;
  userName?: string;
  phoneNumber?: string;
  email?: string;
  loyaltyPoints: number;
  membershipTier?: string;
  totalSpent?: number;
  totalOrders?: number;
  isFirstTimeUser?: boolean;
}

interface OfflineTransactionPreview {
  customerData: CustomerData;
  purchaseAmount: number;
  availablePoints: number;
  maxRedeemableAmount: number;
  finalPayableAmount: number;
  pointsToRedeem: number;
  pointsToEarn: number;
  newPointsBalance: number;
}

const StaffQRScannerScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionPreview, setTransactionPreview] = useState<OfflineTransactionPreview | null>(null);
  const [transactionComplete, setTransactionComplete] = useState(false);
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

  const generateReadableOrderId = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `OFF${timestamp}${randomSuffix}`;
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
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

    setLoading(true);
    try {
      // Fetch customer data
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('Customer profile not found');
      }

      const userData = userDoc.data() as CustomerData;
      const customer: CustomerData = {
        displayName: userData.displayName || 'Customer',
        userName: userData.userName || '',
        phoneNumber: userData.phoneNumber || '',
        email: userData.email || '',
        loyaltyPoints: userData.loyaltyPoints || 0,
        membershipTier: userData.membershipTier || 'Bronze',
        totalSpent: userData.totalSpent || 0,
        totalOrders: userData.totalOrders || 0,
        isFirstTimeUser: userData.isFirstTimeUser ?? true
      };

      setScannedUserId(userId);
      setCustomerData(customer);
      setShowAmountInput(true);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      Alert.alert(
        'Error',
        'Failed to load customer data. Please try again.',
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
    } finally {
      setLoading(false);
    }
  };

  const handleAmountSubmit = async () => {
    if (!purchaseAmount || !customerData || !scannedUserId) {
      Alert.alert('Error', 'Please enter a valid purchase amount');
      return;
    }

    const amount = parseFloat(purchaseAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Purchase amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Get user's current points using loyaltyService
      const availablePoints = await loyaltyService.getUserPoints(scannedUserId);
      
      // Calculate maximum redeemable amount
      const maxRedeemableAmount = loyaltyService.calculateMaxRedeemableAmount(availablePoints, amount);
      
      // Calculate points to earn on final amount (after discount)
      const finalPayableAmount = amount - maxRedeemableAmount;
      const pointsToEarn = loyaltyService.calculatePointsEarned(finalPayableAmount);
      
      // Calculate new points balance
      const pointsToRedeem = maxRedeemableAmount; // 1 point = ₹1
      const newPointsBalance = availablePoints - pointsToRedeem + pointsToEarn;

      const preview: OfflineTransactionPreview = {
        customerData,
        purchaseAmount: amount,
        availablePoints,
        maxRedeemableAmount,
        finalPayableAmount,
        pointsToRedeem,
        pointsToEarn,
        newPointsBalance
      };

      setTransactionPreview(preview);
      setShowConfirmation(true);
      setShowAmountInput(false);

    } catch (error) {
      console.error('Error calculating discount:', error);
      Alert.alert('Error', 'Failed to calculate discount. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createOfflineOrder = async (preview: OfflineTransactionPreview): Promise<string> => {
    try {
      const currentTimestamp = Timestamp.now();
      const orderId = generateReadableOrderId();
      const autoGeneratedId = doc(collection(db, 'orders')).id;

      const orderData: OrderData = {
        id: autoGeneratedId,
        orderId: orderId,
        userId: scannedUserId!,
        items: [], // Empty for offline orders
        totalAmount: preview.purchaseAmount,
        originalAmount: preview.purchaseAmount,
        orderStatus: 'completed',
        orderType: 'offline',
        tableNumber: '',
        paymentMode: 'offline',
        paymentStatus: 'paid',
        description: 'Offline order with points discount',
        createdAt: currentTimestamp,
        baristaNotes: '',
        isRewardEarned: true,
        rating: null,
        mood: null,
        discountType: 'points',
        pointsUsed: preview.pointsToRedeem,
        discountValue: preview.maxRedeemableAmount,
        finalAmountPaid: preview.finalPayableAmount,
        loyaltyDetails: {
          pointsBeforeOrder: preview.availablePoints,
          pointsRedeemed: preview.pointsToRedeem,
          pointsAfterOrder: preview.newPointsBalance,
          pointsEarned: preview.pointsToEarn,
          discountApplied: {
            type: 'points',
            amount: preview.maxRedeemableAmount,
            description: 'Redeemed user loyalty points'
          },
          amountDetails: {
            originalAmount: preview.purchaseAmount,
            discountAmount: preview.maxRedeemableAmount,
            finalAmount: preview.finalPayableAmount
          }
        },
        isOfflineOrder: true
      };

      // Save order to Firestore
      await addDoc(collection(db, 'orders'), orderData);
      
      return orderId;
    } catch (error) {
      console.error('Error creating offline order:', error);
      throw error;
    }
  };

  const createLoyaltyTransaction = async (preview: OfflineTransactionPreview, orderId: string) => {
    try {
      const currentTimestamp = Timestamp.now();
      
      const loyaltyTransactionData: Omit<ComprehensiveLoyaltyTransaction, 'id' | 'auditTrail'> & { createdBy: string } = {
        userId: scannedUserId!,
        userName: preview.customerData.displayName || preview.customerData.userName || 'Guest',
        orderId: orderId,
        userDetails: {
          phoneNumber: preview.customerData.phoneNumber || '',
          email: preview.customerData.email || '',
          isFirstTimeUser: preview.customerData.isFirstTimeUser ?? true,
          totalOrdersBeforeThis: preview.customerData.totalOrders || 0,
          totalSpentBeforeThis: preview.customerData.totalSpent || 0
        },
        orderDetails: {
          originalAmount: preview.purchaseAmount,
          discountType: 'points',
          discountAmount: preview.maxRedeemableAmount,
          finalAmount: preview.finalPayableAmount,
          items: [], // Empty for offline orders
          orderType: 'offline',
          tableNumber: '',
          baristaNotes: ''
        },
        loyaltyDetails: {
          pointsBeforeTransaction: preview.availablePoints,
          pointsEarned: preview.pointsToEarn,
          pointsRedeemed: preview.pointsToRedeem,
          pointsAfterTransaction: preview.newPointsBalance,
          earningRate: loyaltyService.pointsEarningRate
        },
        transactionDetails: {
          timestamp: currentTimestamp,
          paymentMode: 'offline',
          status: 'completed',
          staffId: auth.currentUser?.uid || 'system',
          notes: 'Offline order with points discount'
        },
        createdBy: auth.currentUser?.uid || 'system'
      };

      // Add the transaction to the loyaltyTransactions collection
      await addDoc(collection(db, 'loyaltyTransactions'), loyaltyTransactionData);
    } catch (error) {
      console.error('Error creating loyalty transaction:', error);
      throw error;
    }
  };

  const updateCustomerProfile = async (preview: OfflineTransactionPreview) => {
    try {
      const userDocRef = doc(db, 'users', scannedUserId!);
      const currentTimestamp = Timestamp.now();
      
      await updateDoc(userDocRef, {
        totalOrders: increment(1),
        totalSpent: increment(preview.finalPayableAmount),
        loyaltyPoints: preview.newPointsBalance,
        updatedAt: currentTimestamp
      });

    } catch (error) {
      console.error('Error updating customer profile:', error);
      throw error;
    }
  };

  const processTransaction = async () => {
    if (!transactionPreview || !scannedUserId) return;

    setLoading(true);
    try {
      // Create offline order
      const orderId = await createOfflineOrder(transactionPreview);
      
      // Create loyalty transaction record
      await createLoyaltyTransaction(transactionPreview, orderId);
      
      // Update customer profile
      await updateCustomerProfile(transactionPreview);
      
      setTransactionComplete(true);
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
    setCustomerData(null);
    setPurchaseAmount('');
    setShowAmountInput(false);
    setShowConfirmation(false);
    setTransactionPreview(null);
    setTransactionComplete(false);
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
        <Text style={styles.headerTitle}>Offline Purchase</Text>
        {(showAmountInput || showConfirmation || transactionComplete) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <MaterialIcons name="refresh" size={24} color={COLORS.primaryOrangeHex} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Camera Scanner */}
      {!showAmountInput && !showConfirmation && !transactionComplete && (
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

      {/* Amount Input Screen */}
      {showAmountInput && customerData && (
        <ScrollView style={styles.inputContainer}>
          <View style={styles.customerInfoCard}>
            <Text style={styles.customerName}>{customerData.displayName}</Text>
            <View style={styles.pointsContainer}>
              <MaterialIcons name="stars" size={20} color={COLORS.primaryOrangeHex} />
              <Text style={styles.customerPoints}>Available Points: ₹{customerData.loyaltyPoints}</Text>
            </View>
            {customerData.membershipTier && (
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{customerData.membershipTier}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter Purchase Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>
            
            <View style={styles.discountInfo}>
              <MaterialIcons name="info-outline" size={16} color={COLORS.primaryOrangeHex} />
              <Text style={styles.discountInfoText}>
                Maximum points discount will be auto-applied
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.processButton, loading && styles.disabledButton]}
              onPress={handleAmountSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.processButtonText}>Calculate & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Confirmation Screen */}
      {showConfirmation && transactionPreview && (
        <ScrollView style={styles.confirmationContainer}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Confirm Transaction</Text>
            
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{transactionPreview.customerData.displayName}</Text>
              <Text style={styles.currentPoints}>Available Points: ₹{transactionPreview.availablePoints}</Text>
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Amount:</Text>
                <Text style={styles.detailValue}>₹{transactionPreview.purchaseAmount.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Max Points Discount:</Text>
                <Text style={[styles.detailValue, styles.discountValue]}>
                  -₹{transactionPreview.maxRedeemableAmount.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points to Use:</Text>
                <Text style={styles.detailValue}>{transactionPreview.pointsToRedeem}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points to Earn:</Text>
                <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                  +{transactionPreview.pointsToEarn}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>New Points Balance:</Text>
                <Text style={styles.detailValue}>{transactionPreview.newPointsBalance}</Text>
              </View>
              
              <View style={styles.divider} />
              <View style={styles.finalAmountRow}>
                <Text style={styles.finalAmountLabel}>Final Payable:</Text>
                <Text style={styles.finalAmountValue}>
                  ₹{transactionPreview.finalPayableAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={processTransaction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.primaryWhiteHex} />
                ) : (
                  <Text style={styles.confirmButtonText}>Complete Transaction</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Transaction Complete Screen */}
      {transactionComplete && transactionPreview && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <View style={styles.successResult}>
              <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
              <Text style={styles.successTitle}>Transaction Completed!</Text>
              
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{transactionPreview.customerData.displayName}</Text>
              </View>

              <View style={styles.transactionSummary}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purchase Amount:</Text>
                  <Text style={styles.detailValue}>₹{transactionPreview.purchaseAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points Discount:</Text>
                  <Text style={[styles.detailValue, styles.discountValue]}>
                    -₹{transactionPreview.maxRedeemableAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points Earned:</Text>
                  <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                    +{transactionPreview.pointsToEarn}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.finalAmountRow}>
                  <Text style={styles.finalAmountLabel}>Amount Paid:</Text>
                  <Text style={styles.finalAmountValue}>
                    ₹{transactionPreview.finalPayableAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.newTransactionButton} onPress={resetScanner}>
              <Text style={styles.newTransactionButtonText}>New Transaction</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Instructions */}
      {!showAmountInput && !showConfirmation && !transactionComplete && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Ask customer to show their loyalty QR code
          </Text>
          <Text style={styles.subInstructionText}>
            Maximum point discount will be automatically applied
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
  customerInfoCard: {
    backgroundColor: '#F8F9FA',
    margin: SPACING.space_20,
    padding: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  customerName: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_10,
  },
  customerPoints: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
  },
  tierBadge: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
  },
  tierText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryWhiteHex,
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
    marginBottom: SPACING.space_15,
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
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    marginBottom: SPACING.space_20,
  },
  discountInfoText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
    flex: 1,
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
  confirmationContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  confirmationCard: {
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
  confirmationTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  customerInfo: {
    alignItems: 'center',
    marginBottom: SPACING.space_20,
    paddingBottom: SPACING.space_15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  currentPoints: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_4,
  },
  transactionDetails: {
    marginBottom: SPACING.space_24,
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
    flex: 1,
  },
  detailValue: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    textAlign: 'right',
  },
  discountValue: {
    color: '#4CAF50',
  },
  pointsEarnedValue: {
    color: COLORS.primaryOrangeHex,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: SPACING.space_12,
  },
  finalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space_12,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_10,
    marginTop: SPACING.space_8,
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
  confirmationButtons: {
    flexDirection: 'row',
    gap: SPACING.space_12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  confirmButtonText: {
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
  successResult: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FONTSIZE.size_22,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: SPACING.space_15,
    marginBottom: SPACING.space_20,
  },
  transactionSummary: {
    width: '100%',
    marginBottom: SPACING.space_24,
  },
  newTransactionButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginTop: SPACING.space_20,
  },
  newTransactionButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  instructions: {
    position: 'absolute',
    bottom: SPACING.space_30,
    left: SPACING.space_20,
    right: SPACING.space_20,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_8,
  },
  subInstructionText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
  },
  scanAgainButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_15,
    marginTop: SPACING.space_15,
  },
  scanAgainText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    textAlign: 'center',
  },
  text: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    margin: SPACING.space_20,
  },
  button: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    paddingHorizontal: SPACING.space_30,
    borderRadius: BORDERRADIUS.radius_15,
    alignSelf: 'center',
    margin: SPACING.space_20,
  },
  buttonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
  },
});

export default StaffQRScannerScreen;