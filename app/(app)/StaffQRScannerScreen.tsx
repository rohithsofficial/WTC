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
  StatusBar,
  Platform,
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
  totalSpent?: number;
  totalOrders?: number;
  isFirstTimeUser?: boolean;
}

interface TransactionPreview {
  customerData: CustomerData;
  billAmount: number;
  availablePoints: number;
  pointsDiscount: number;
  customerPays: number;
  pointsUsed: number;
  pointsEarned: number;
  newPointsBalance: number;
}

interface StaffInfo {
  displayName: string;
  employeeId?: string;
  email?: string;
}

const StaffQRScannerScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [showBillInput, setShowBillInput] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | null>(null);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    const getStaffInfo = async () => {
      try {
        if (auth.currentUser) {
          const staffDocRef = doc(db, 'users', auth.currentUser.uid);
          const staffDoc = await getDoc(staffDocRef);
          
          if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            setStaffInfo({
              displayName: staffData.displayName || staffData.name || 'Staff',
              employeeId: staffData.employeeId || auth.currentUser.uid.slice(-6).toUpperCase(),
              email: staffData.email || auth.currentUser.email || ''
            });
          } else {
            // Fallback if staff document doesn't exist
            setStaffInfo({
              displayName: auth.currentUser.displayName || 'Staff',
              employeeId: auth.currentUser.uid.slice(-6).toUpperCase(),
              email: auth.currentUser.email || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching staff info:', error);
        // Set basic fallback info
        setStaffInfo({
          displayName: 'Staff',
          employeeId: auth.currentUser?.uid.slice(-6).toUpperCase() || 'STAFF',
          email: auth.currentUser?.email || ''
        });
      }
    };

    getCameraPermissions();
    getStaffInfo();
  }, []);

// Enhanced refresh camera function
  const refreshCamera = () => {
  console.log('Refreshing camera...');
  setScanned(false);
  setLoading(false);
  setCameraKey(prev => prev + 1);
};

// 5. Test QR Code Generation (for testing purposes)
const generateTestQRData = (userId: string): string => {
  // Option 1: Simple format
  return userId;
  
  // Option 2: JSON format
  // return JSON.stringify({ userId, timestamp: Date.now() });
  
  // Option 3: JWT-like format (simplified)
  // const payload = { userId, exp: Math.floor(Date.now() / 1000) + 3600 };
  // return `header.${btoa(JSON.stringify(payload))}.signature`;
};

// 6. Debug function to test with manual input
const testWithManualUserId = async (testUserId: string) => {
  console.log('Testing with manual userId:', testUserId);
  await handleBarCodeScanned({ 
    type: 'qr', 
    data: testUserId 
  });
};

// Usage in your component:
// Add this button temporarily for testing
const TestButton = () => (
  <TouchableOpacity 
    style={styles.testButton}
    onPress={() => testWithManualUserId('your_test_user_id_here')}
  >
    <Text style={styles.testButtonText}>Test with Sample User</Text>
  </TouchableOpacity>
);

  const validateQRToken = (data: string): string | null => {
  try {
    console.log('Scanned QR data:', data); // Debug log
    
    // Handle different QR code formats
    
    // Format 1: JWT Token
    if (data.includes('.') && data.split('.').length === 3) {
      try {
        const parts = data.split('.');
        const payload = JSON.parse(atob(parts[1]));
        console.log('JWT Payload:', payload); // Debug log
        
        if (payload.userId && payload.exp && payload.exp > Date.now() / 1000) {
          return payload.userId;
        }
      } catch (jwtError) {
        console.log('JWT parsing failed, trying other formats');
      }
    }
    
    // Format 2: Direct userId (for testing)
    if (data.length > 10 && (data.includes('user_') || data.startsWith('uid_'))) {
      return data;
    }
    
    // Format 3: JSON format
    if (data.startsWith('{') && data.endsWith('}')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.userId || parsed.uid || parsed.id) {
          return parsed.userId || parsed.uid || parsed.id;
        }
      } catch (jsonError) {
        console.log('JSON parsing failed');
      }
    }
    
    // Format 4: URL format (like loyalty://user/123456)
    if (data.includes('://') || data.includes('user/') || data.includes('loyalty/')) {
      const userIdMatch = data.match(/(?:user[/_]|loyalty[/_]|uid[/_])([a-zA-Z0-9_-]+)/i);
      if (userIdMatch && userIdMatch[1]) {
        return userIdMatch[1];
      }
    }
    
    // Format 5: Simple alphanumeric ID (minimum 8 characters)
    if (/^[a-zA-Z0-9_-]{8,}$/.test(data)) {
      return data;
    }
    
    console.log('No valid format found for QR data:', data);
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
  console.log('QR Code scanned:', { type, data }); // Debug log
  
  if (scanned) {
    console.log('Already processing a scan, ignoring...');
    return;
  }
  
  setScanned(true);
  setLoading(true);
  
  try {
    const userId = validateQRToken(data);
    console.log('Extracted userId:', userId); // Debug log
    
    if (!userId) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not recognized. Please ask the customer to refresh their QR code and try again.',
        [
          { 
            text: 'Scan Again', 
            onPress: () => {
              setScanned(false);
              setLoading(false);
              refreshCamera();
            }
          },
          { 
            text: 'Cancel', 
            onPress: () => {
              setLoading(false);
              router.back();
            }
          },
        ]
      );
      return;
    }

    console.log('Fetching customer data for userId:', userId);
    
    // Get customer details
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('Customer document not found');
      throw new Error('Customer not found in database');
    }

    const userData = userDoc.data();
    console.log('Customer data fetched:', userData);
    
    const customer: CustomerData = {
      displayName: userData.displayName || userData.name || 'Customer',
      userName: userData.userName || '',
      phoneNumber: userData.phoneNumber || '',
      email: userData.email || '',
      loyaltyPoints: userData.loyaltyPoints || 0,
      totalSpent: userData.totalSpent || 0,
      totalOrders: userData.totalOrders || 0,
      isFirstTimeUser: userData.isFirstTimeUser ?? true
    };

    setScannedUserId(userId);
    setCustomerData(customer);
    setShowBillInput(true);
    
    console.log('Successfully processed QR scan');

  } catch (error) {
    console.error('Error processing QR scan:', error);
    Alert.alert(
      'Error',
      `Could not load customer details: ${error.message}. Please try scanning again.`,
      [
        { 
          text: 'Scan Again', 
          onPress: () => {
            setScanned(false);
            setLoading(false);
            refreshCamera();
          }
        },
        { 
          text: 'Cancel', 
          onPress: () => {
            setLoading(false);
            router.back();
          }
        },
      ]
    );
  } finally {
    setLoading(false);
  }
};

 const handleBillSubmit = async () => {
  if (!billAmount || !customerData || !scannedUserId) {
    Alert.alert('Error', 'Please enter bill amount');
    return;
  }

  const amount = parseFloat(billAmount);
  if (amount <= 0) {
    Alert.alert('Error', 'Bill amount must be greater than 0');
    return;
  }

  setLoading(true);
  try {
    // Get fresh customer data directly from Firestore to ensure accuracy
    const userDocRef = doc(db, 'users', scannedUserId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('Customer data not found');
    }
    
    const freshUserData = userDoc.data();
    const availablePoints = freshUserData.loyaltyPoints || 0;
    
    // Calculate discount using the fresh points data
    const pointsDiscount = loyaltyService.calculateMaxRedeemableAmount(availablePoints, amount);
    
    // Calculate final amount customer pays
    const customerPays = amount - pointsDiscount;
    
    // Fixed points calculation: 1 point for every 10 rupees spent (after discount)
    const pointsEarned = Math.floor(customerPays / 10);
    
    // Calculate new points balance
    const pointsUsed = pointsDiscount; // 1 point = ₹1
    const newPointsBalance = availablePoints - pointsUsed + pointsEarned;

    // Update customer data with fresh points
    const updatedCustomerData = {
      ...customerData,
      loyaltyPoints: availablePoints
    };

    const preview: TransactionPreview = {
      customerData: updatedCustomerData,
      billAmount: amount,
      availablePoints,
      pointsDiscount,
      customerPays,
      pointsUsed,
      pointsEarned,
      newPointsBalance
    };

    setTransactionPreview(preview);
    setCustomerData(updatedCustomerData); // Update the customer data state as well
    setShowConfirmation(true);
    setShowBillInput(false);

  } catch (error) {
    console.error('Error calculating discount:', error);
    Alert.alert('Error', 'Could not calculate discount. Please try again.');
  } finally {
    setLoading(false);
  }
};

//  Updated Camera Component with better barcode settings

  const CameraComponent = () => (
  <CameraView
    key={cameraKey}
    style={styles.camera}
    facing="back"
    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
    barcodeScannerSettings={{
      barcodeTypes: ['qr', 'pdf417', 'aztec', 'code128', 'code39', 'datamatrix'],
    }}
  />
);

  const createOfflineOrder = async (preview: TransactionPreview): Promise<string> => {
    try {
      const currentTimestamp = Timestamp.now();
      const orderId = generateReadableOrderId();
      const autoGeneratedId = doc(collection(db, 'orders')).id;

      const orderData: OrderData = {
        id: autoGeneratedId,
        orderId: orderId,
        userId: scannedUserId!,
        items: [], // Empty for offline orders
        totalAmount: preview.billAmount,
        originalAmount: preview.billAmount,
        orderStatus: 'completed',
        orderType: 'offline',
        tableNumber: '',
        paymentMode: 'offline',
        paymentStatus: 'paid',
        description: 'Offline purchase with points discount',
        createdAt: currentTimestamp,
        baristaNotes: '',
        isRewardEarned: true,
        rating: null,
        mood: null,
        discountType: 'points',
        pointsUsed: preview.pointsUsed,
        discountValue: preview.pointsDiscount,
        finalAmountPaid: preview.customerPays,
        loyaltyDetails: {
          pointsBeforeOrder: preview.availablePoints,
          pointsRedeemed: preview.pointsUsed,
          pointsAfterOrder: preview.newPointsBalance,
          pointsEarned: preview.pointsEarned,
          discountApplied: {
            type: 'points',
            amount: preview.pointsDiscount,
            description: 'Points discount applied'
          },
          amountDetails: {
            originalAmount: preview.billAmount,
            discountAmount: preview.pointsDiscount,
            finalAmount: preview.customerPays
          }
        },
        isOfflineOrder: true
      };

      // Save order to database
      await addDoc(collection(db, 'orders'), orderData);
      
      return orderId;
    } catch (error) {
      console.error('Error creating offline order:', error);
      throw error;
    }
  };

  const createLoyaltyTransaction = async (preview: TransactionPreview, orderId: string) => {
    try {
      const currentTimestamp = Timestamp.now();
      
      const loyaltyTransactionData: Omit<ComprehensiveLoyaltyTransaction, 'id' | 'auditTrail'> & { createdBy: string } = {
        userId: scannedUserId!,
        userName: preview.customerData.displayName || preview.customerData.userName || 'Customer',
        orderId: orderId,
        userDetails: {
          phoneNumber: preview.customerData.phoneNumber || '',
          email: preview.customerData.email || '',
          isFirstTimeUser: preview.customerData.isFirstTimeUser ?? true,
          totalOrdersBeforeThis: preview.customerData.totalOrders || 0,
          totalSpentBeforeThis: preview.customerData.totalSpent || 0
        },
        orderDetails: {
          originalAmount: preview.billAmount,
          discountType: 'points',
          discountAmount: preview.pointsDiscount,
          finalAmount: preview.customerPays,
          items: [], // Empty for offline orders
          orderType: 'offline',
          tableNumber: '',
          baristaNotes: ''
        },
        loyaltyDetails: {
          pointsBeforeTransaction: preview.availablePoints,
          pointsEarned: preview.pointsEarned,
          pointsRedeemed: preview.pointsUsed,
          pointsAfterTransaction: preview.newPointsBalance,
          earningRate: loyaltyService.pointsEarningRate
        },
        transactionDetails: {
          timestamp: currentTimestamp,
          paymentMode: 'offline',
          status: 'completed',
          staffId: auth.currentUser?.uid || 'system',
          notes: 'Offline purchase processed by staff'
        },
        createdBy: auth.currentUser?.uid || 'system'
      };

      // Save loyalty transaction
      await addDoc(collection(db, 'loyaltyTransactions'), loyaltyTransactionData);
    } catch (error) {
      console.error('Error creating loyalty transaction:', error);
      throw error;
    }
  };

  const updateCustomerProfile = async (preview: TransactionPreview) => {
    try {
      const userDocRef = doc(db, 'users', scannedUserId!);
      const currentTimestamp = Timestamp.now();
      
      await updateDoc(userDocRef, {
        totalOrders: increment(1),
        totalSpent: increment(preview.customerPays),
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
      // Create order record
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
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewScan = () => {
    setScanned(false);
    setScannedUserId(null);
    setCustomerData(null);
    setBillAmount(''); // Clear amount after successful transaction
    setShowBillInput(false);
    setShowConfirmation(false);
    setTransactionPreview(null);
    setTransactionComplete(false);
    refreshCamera();
  };

  const handleBackPress = () => {
    if (showBillInput) {
      // If on bill input screen, go back to scanner
      setShowBillInput(false);
      setScanned(false);
      setCustomerData(null);
      setScannedUserId(null);
      setBillAmount('');
      refreshCamera();
    } else if (showConfirmation) {
      // If on confirmation screen, go back to bill input
      setShowConfirmation(false);
      setShowBillInput(true);
    } else if (transactionComplete) {
      // If transaction complete, start new scan
      startNewScan();
    } else {
      // Default: go back to previous screen
      router.back();
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryBlackHex} />
        <Text style={styles.text}>Getting camera ready...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryBlackHex} />
        <Text style={styles.text}>Camera access needed to scan QR codes</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primaryWhiteHex} />
      
      {/* Enhanced Header with Staff Info */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Staff QR Scanner</Text>
          {staffInfo && (
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staffInfo.displayName}</Text>
              <Text style={styles.staffId}>ID: {staffInfo.employeeId}</Text>
            </View>
          )}
        </View>
        
        {(showBillInput || showConfirmation || transactionComplete) && (
          <TouchableOpacity style={styles.resetButton} onPress={startNewScan}>
            <MaterialIcons name="refresh" size={24} color={COLORS.primaryOrangeHex} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Instructions - Only show once */}
      {!showBillInput && !showConfirmation && !transactionComplete && (
        <View style={styles.instructions}>
          <MaterialIcons name="qr-code-scanner" size={32} color={COLORS.primaryWhiteHex} />
          <Text style={styles.instructionTitle}>Ready to Scan</Text>
          <Text style={styles.instructionText}>
            Ask customer to show their QR code
          </Text>
          <Text style={styles.subInstructionText}>
            Points discount will be applied automatically
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

      {/* QR Code Scanner */}
      {!showBillInput && !showConfirmation && !transactionComplete && (
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
              Position QR code within the frame
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

      {/* Bill Amount Input */}
      {showBillInput && customerData && (
        <ScrollView style={styles.inputContainer}>
          <View style={styles.customerInfoCard}>
            <Text style={styles.customerName}>{customerData.displayName}</Text>
            <View style={styles.pointsContainer}>
              <MaterialIcons name="stars" size={20} color={COLORS.primaryOrangeHex} />
              <Text style={styles.customerPoints}>Points Available: ₹{customerData.loyaltyPoints}</Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter Bill Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={billAmount}
                onChangeText={setBillAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>
            
            <View style={styles.discountInfo}>
              <MaterialIcons name="info-outline" size={16} color={COLORS.primaryOrangeHex} />
              <Text style={styles.discountInfoText}>
                Maximum points discount will be applied automatically
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.processButton, loading && styles.disabledButton]}
              onPress={handleBillSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.processButtonText}>Calculate Discount</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Confirmation Screen */}
      {showConfirmation && transactionPreview && (
        <ScrollView style={styles.confirmationContainer}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Confirm Sale</Text>
            
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{transactionPreview.customerData.displayName}</Text>
              <Text style={styles.currentPoints}>Available Points: ₹{transactionPreview.availablePoints}</Text>
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bill Amount:</Text>
                <Text style={styles.detailValue}>₹{transactionPreview.billAmount.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points Discount:</Text>
                <Text style={[styles.detailValue, styles.discountValue]}>
                  -₹{transactionPreview.pointsDiscount.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points Used:</Text>
                <Text style={styles.detailValue}>{transactionPreview.pointsUsed}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points Earned:</Text>
                <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                  +{transactionPreview.pointsEarned}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>New Points Balance:</Text>
                <Text style={styles.detailValue}>{transactionPreview.newPointsBalance}</Text>
              </View>
              
              <View style={styles.divider} />
              <View style={styles.finalAmountRow}>
                <Text style={styles.finalAmountLabel}>Customer Pays:</Text>
                <Text style={styles.finalAmountValue}>
                  ₹{transactionPreview.customerPays.toFixed(2)}
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
                  <Text style={styles.confirmButtonText}>Complete Sale</Text>
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
              <Text style={styles.successTitle}>Sale Completed!</Text>
              
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{transactionPreview.customerData.displayName}</Text>
              </View>

              <View style={styles.transactionSummary}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bill Amount:</Text>
                  <Text style={styles.detailValue}>₹{transactionPreview.billAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points Discount:</Text>
                  <Text style={[styles.detailValue, styles.discountValue]}>
                    -₹{transactionPreview.pointsDiscount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points Earned:</Text>
                  <Text style={[styles.detailValue, styles.pointsEarnedValue]}>
                    +{transactionPreview.pointsEarned}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.finalAmountRow}>
                  <Text style={styles.finalAmountLabel}>Customer Paid:</Text>
                  <Text style={styles.finalAmountValue}>
                    ₹{transactionPreview.customerPays.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.newTransactionButton} onPress={startNewScan}>
              <Text style={styles.newTransactionButtonText}>Process Next Sale</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? SPACING.space_15 : SPACING.space_20, // Extra padding for status bar
    backgroundColor: COLORS.primaryWhiteHex,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: '#F5F5F5',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.space_15,
  },
  headerTitle: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  staffInfo: {
    alignItems: 'center',
    marginTop: SPACING.space_4,
  },
  staffName: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
  },
  staffId: {
    fontSize: FONTSIZE.size_10,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
  },
  resetButton: {
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: '#FFF3E0',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    marginTop: SPACING.space_10, // Additional margin to avoid overlap
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  },
  customerPoints: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
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
  // Continuing from where the code was cut off...

  detailLabel: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    flex: 1,
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
    backgroundColor: '#E0E0E0',
    marginVertical: SPACING.space_12,
  },
  finalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: SPACING.space_12,
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
    gap: SPACING.space_15,
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
    fontFamily: FONTFAMILY.poppins_medium,
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
    marginBottom: SPACING.space_24,
  },
  successTitle: {
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_bold,
    color: '#4CAF50',
    marginTop: SPACING.space_15,
    marginBottom: SPACING.space_20,
  },
  transactionSummary: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_20,
  },
  newTransactionButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  newTransactionButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_30,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    textAlign: 'center',
    marginBottom: SPACING.space_8,
  },
  subInstructionText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    textAlign: 'center',
    opacity: 0.8,
  },
  scanAgainButton: {
    marginTop: SPACING.space_15,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
  },
  scanAgainText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  text: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginVertical: SPACING.space_20,
  },
  button: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    paddingHorizontal: SPACING.space_30,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginHorizontal: SPACING.space_20,
  },
  buttonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
});

export default StaffQRScannerScreen;