// app/(app)/StaffQRScannerScreen.tsx - FIXED BARCODE SUPPORT
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
import { doc, getDoc, addDoc, collection, updateDoc, increment, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { loyaltyService, ComprehensiveLoyaltyTransaction } from '../../src/services/loyaltyService';
import { OrderData } from '../../src/types/offlineOrderData';
import * as Brightness from 'expo-brightness';

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
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);

  // FIXED: Enhanced brightness management with proper Android handling
  const increaseBrightness = async () => {
    try {
      if (Platform.OS === 'android') {
        // On Android, we'll use a more reliable approach
        await Brightness.setBrightnessAsync(1.0);
        console.log('Screen brightness increased for scanning (Android)');
      } else {
        // On iOS, we can safely get and store the original brightness
        const currentBrightness = await Brightness.getBrightnessAsync();
        setOriginalBrightness(currentBrightness);
        await Brightness.setBrightnessAsync(1.0);
        console.log('Screen brightness increased for scanning (iOS)');
      }
    } catch (error) {
      console.error('Error increasing brightness:', error);
      // Fallback to a safe brightness value
      try {
        await Brightness.setBrightnessAsync(0.9);
      } catch (fallbackError) {
        console.error('Fallback brightness setting failed:', fallbackError);
      }
    }
  };

  const restoreBrightness = async () => {
    try {
      if (Platform.OS === 'android') {
        // On Android, restore to a default brightness
        await Brightness.setBrightnessAsync(0.5);
        console.log('Screen brightness restored (Android)');
      } else if (originalBrightness !== null) {
        // On iOS, restore to the original brightness
        await Brightness.setBrightnessAsync(originalBrightness);
        setOriginalBrightness(null);
        console.log('Screen brightness restored (iOS)');
      }
    } catch (error) {
      console.error('Error restoring brightness:', error);
      // Fallback to a safe brightness value
      try {
        await Brightness.setBrightnessAsync(0.5);
      } catch (fallbackError) {
        console.error('Fallback brightness restoration failed:', fallbackError);
      }
    }
  };

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
            setStaffInfo({
              displayName: auth.currentUser.displayName || 'Staff',
              employeeId: auth.currentUser.uid.slice(-6).toUpperCase(),
              email: auth.currentUser.email || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching staff info:', error);
        setStaffInfo({
          displayName: 'Staff',
          employeeId: auth.currentUser?.uid.slice(-6).toUpperCase() || 'STAFF',
          email: auth.currentUser?.email || ''
        });
      }
    };

    getCameraPermissions();
    getStaffInfo();
    increaseBrightness();

    return () => {
      restoreBrightness();
    };
  }, []);

  // FIXED: Enhanced barcode token decoding with proper database queries
 const decodeBarcodeToken = async (barcodeData: string): Promise<string | null> => {
  try {
    console.log('🔍 Starting barcode decode for:', barcodeData);
    console.log('📊 Barcode length:', barcodeData.length);
    
    // Strategy 1: Direct barcode token lookup (PRIMARY - matches your generation logic)
    try {
      console.log('🎯 Strategy 1: Checking currentBarcodeToken field...');
      const barcodeQuery = query(
        collection(db, 'users'), 
        where('currentBarcodeToken', '==', barcodeData)
      );
      const barcodeSnapshot = await getDocs(barcodeQuery);
      
      if (!barcodeSnapshot.empty) {
        const userId = barcodeSnapshot.docs[0].id;
        console.log('✅ SUCCESS: Found user by currentBarcodeToken:', userId);
        return userId;
      } else {
        console.log('❌ No user found with currentBarcodeToken:', barcodeData);
      }
    } catch (error) {
      console.error('🚨 Error in Strategy 1 (currentBarcodeToken):', error);
    }

    // Strategy 2: Check barcodeHistory collection (SECONDARY - for expired tokens)
    try {
      console.log('🎯 Strategy 2: Checking barcodeHistory collection...');
      const historyQuery = query(
        collection(db, 'barcodeHistory'),
        where('barcode', '==', barcodeData),
        where('expiryTime', '>', Timestamp.now())
      );
      const historySnapshot = await getDocs(historyQuery);
      
      if (!historySnapshot.empty) {
        const userId = historySnapshot.docs[0].data().userId;
        console.log('✅ SUCCESS: Found user in barcodeHistory:', userId);
        return userId;
      } else {
        console.log('❌ No active barcode found in history for:', barcodeData);
      }
    } catch (error) {
      console.error('🚨 Error in Strategy 2 (barcodeHistory):', error);
    }

    // Strategy 3: EAN-13 format handling (for standard barcode formats)
    if (barcodeData.length === 13 && /^\d{13}$/.test(barcodeData)) {
      console.log('🎯 Strategy 3: Processing as EAN-13...');
      try {
        const variations = [
          barcodeData,
          barcodeData.substring(0, 12), // Without check digit
          barcodeData.substring(1), // Without first digit
          barcodeData.substring(1, 12) // Without first and last digit
        ];

        for (const variation of variations) {
          console.log(`🔄 Trying EAN-13 variation: ${variation}`);
          const eanQuery = query(
            collection(db, 'users'), 
            where('loyaltyCardNumber', '==', variation)
          );
          const eanSnapshot = await getDocs(eanQuery);
          
          if (!eanSnapshot.empty) {
            const userId = eanSnapshot.docs[0].id;
            console.log('✅ SUCCESS: Found user by EAN-13 variation:', variation, 'UserId:', userId);
            return userId;
          }
        }
        console.log('❌ No user found with any EAN-13 variations');
      } catch (error) {
        console.error('🚨 Error in Strategy 3 (EAN-13):', error);
      }
    }

    // Strategy 4: UPC-E format handling
    if (barcodeData.length === 8 && /^\d{8}$/.test(barcodeData)) {
      console.log('🎯 Strategy 4: Processing as UPC-E...');
      try {
        const upcA = convertUPC_EtoUPC_A(barcodeData);
        console.log('🔄 Converted UPC-E to UPC-A:', upcA);
        
        const upcQuery = query(
          collection(db, 'users'), 
          where('loyaltyCardNumber', '==', upcA)
        );
        const upcSnapshot = await getDocs(upcQuery);
        
        if (!upcSnapshot.empty) {
          const userId = upcSnapshot.docs[0].id;
          console.log('✅ SUCCESS: Found user by UPC-A conversion:', userId);
          return userId;
        }
      } catch (error) {
        console.error('🚨 Error in Strategy 4 (UPC-E):', error);
      }
    }

    // Strategy 5: Direct loyaltyCardNumber lookup
    try {
      console.log('🎯 Strategy 5: Checking loyaltyCardNumber field...');
      const loyaltyQuery = query(
        collection(db, 'users'), 
        where('loyaltyCardNumber', '==', barcodeData)
      );
      const loyaltySnapshot = await getDocs(loyaltyQuery);
      
      if (!loyaltySnapshot.empty) {
        const userId = loyaltySnapshot.docs[0].id;
        console.log('✅ SUCCESS: Found user by loyaltyCardNumber:', userId);
        return userId;
      } else {
        console.log('❌ No user found with loyaltyCardNumber:', barcodeData);
      }
    } catch (error) {
      console.error('🚨 Error in Strategy 5 (loyaltyCardNumber):', error);
    }

    // Strategy 6: Phone number lookup (for numeric barcodes)
    if (/^\d{10,12}$/.test(barcodeData)) {
      console.log('🎯 Strategy 6: Checking as phone number...');
      try {
        const phoneVariations = [
          barcodeData,
          `+91${barcodeData}`,
          `91${barcodeData}`
        ];

        for (const phoneNum of phoneVariations) {
          console.log(`🔄 Trying phone variation: ${phoneNum}`);
          const phoneQuery = query(
            collection(db, 'users'), 
            where('phoneNumber', '==', phoneNum)
          );
          const phoneSnapshot = await getDocs(phoneQuery);
          
          if (!phoneSnapshot.empty) {
            const userId = phoneSnapshot.docs[0].id;
            console.log('✅ SUCCESS: Found user by phone number:', phoneNum, 'UserId:', userId);
            return userId;
          }
        }
        console.log('❌ No user found with any phone number variations');
      } catch (error) {
        console.error('🚨 Error in Strategy 6 (phone):', error);
      }
    }

    // FINAL: Log all attempted strategies
    console.log('🚫 DECODE FAILED - All strategies exhausted for barcode:', barcodeData);
    console.log('📝 Strategies attempted:');
    console.log('   1. currentBarcodeToken field lookup');
    console.log('   2. barcodeHistory collection lookup');
    console.log('   3. EAN-13 format variations');
    console.log('   4. UPC-E to UPC-A conversion');
    console.log('   5. loyaltyCardNumber field lookup');
    console.log('   6. Phone number variations');
    
    return null;
    
  } catch (error) {
    console.error('🔥 CRITICAL: Barcode decoding crashed:', error);
    return null;
  }
};


  // Helper function to convert UPC-E to UPC-A format
  const convertUPC_EtoUPC_A = (upcE: string): string => {
    if (upcE.length !== 8) return upcE;
    
    const lastDigit = upcE[7];
    const middleDigits = upcE.substring(1, 7);
    
    let upcA = '';
    switch (lastDigit) {
      case '0':
      case '1':
      case '2':
        upcA = `${middleDigits.substring(0, 2)}${lastDigit}0000${middleDigits.substring(2)}`;
        break;
      case '3':
        upcA = `${middleDigits.substring(0, 3)}00000${middleDigits.substring(3)}`;
        break;
      case '4':
        upcA = `${middleDigits.substring(0, 4)}00000${middleDigits.substring(4)}`;
        break;
      default:
        upcA = `${middleDigits}0000${lastDigit}`;
    }
    
    return `0${upcA}`; // Add leading zero for UPC-A format
  };

  const refreshCamera = () => {
    console.log('Refreshing camera...');
    setScanned(false);
    setLoading(false);
    setCameraKey(prev => prev + 1);
  };

  const toggleScanMode = () => {
    setScanMode(prev => prev === 'qr' ? 'barcode' : 'qr');
    refreshCamera();
  };

  // FIXED: Enhanced QR token validation with better error handling
  const validateQRToken = (data: string): string | null => {
    try {
      console.log('Validating QR data:', data, 'Mode:', scanMode);
      
      // JWT Token format
      if (data.includes('.') && data.split('.').length === 3) {
        try {
          const parts = data.split('.');
          const payload = JSON.parse(atob(parts[1]));
          console.log('JWT Payload:', payload);
          
          if (payload.userId && payload.exp && payload.exp > Date.now() / 1000) {
            return payload.userId;
          }
        } catch (jwtError) {
          console.log('JWT parsing failed, trying other formats');
        }
      }
      
      // Direct userId format
      if (data.length > 10 && (data.includes('user_') || data.startsWith('uid_'))) {
        return data;
      }
      
      // JSON format
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
      
      // URL format
      if (data.includes('://') || data.includes('user/') || data.includes('loyalty/')) {
        const userIdMatch = data.match(/(?:user[/_]|loyalty[/_]|uid[/_])([a-zA-Z0-9_-]+)/i);
        if (userIdMatch && userIdMatch[1]) {
          return userIdMatch[1];
        }
      }
      
      // Simple alphanumeric ID
      if (/^[a-zA-Z0-9_-]{8,}$/.test(data)) {
        return data;
      }
      
      console.log('No valid QR format found for scanned data:', data);
      return null;
      
    } catch (error) {
      console.error('QR token validation error:', error);
      return null;
    }
  };

  const generateReadableOrderId = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `OFF${timestamp}${randomSuffix}`;
  };

  // FIXED: Enhanced barcode scanning with proper response handling
  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    try {
      // Validate input parameters
      if (!type || !data) {
        console.log('⚠️ Invalid scan data received:', { type, data });
        return;
      }

      console.log('📱 Code scanned:', { type, data, scanMode });
      
      if (!data || data.trim() === '') {
        console.log('⚠️ Empty barcode data received');
        Alert.alert('Scan Error', 'Empty barcode detected. Please try scanning again.');
        return;
      }

      if (scanned) {
        console.log('🔒 Already processing a scan, ignoring...');
        return;
      }

      setScanned(true);
      let userId: string | null = null;
      
      if (scanMode === 'barcode') {
        console.log('🏷️ Processing as barcode...');
        
        // Enhanced barcode format validation with null checks
        const isValidBarcode = (barcode: string, barcodeType: string): boolean => {
          if (!barcode || !barcodeType) return false;

          try {
            switch (barcodeType.toLowerCase()) {
              case 'codabar':
                // Codabar can contain numbers, letters A-D, and special characters
                return /^[A-D][0-9\-:/.+$]+[A-D]$/.test(barcode);
              case 'code128':
                // Code 128 can contain any ASCII character
                return /^[\x00-\x7F]+$/.test(barcode);
              case 'code39':
                // Code 39 can contain numbers, uppercase letters, and some special characters
                return /^[0-9A-Z\-\.\s\$\/\+\%]+$/.test(barcode);
              case 'ean13':
              case 'ean8':
              case 'upc_e':
              case 'upc_a':
                // EAN/UPC formats must be numeric
                return /^\d+$/.test(barcode);
              default:
                // For unknown formats, accept alphanumeric with common separators
                return /^[0-9A-Za-z\-\.\s]+$/.test(barcode);
            }
          } catch (error) {
            console.error('Error validating barcode format:', error);
            return false;
          }
        };

        if (!isValidBarcode(data, type)) {
          throw new Error(`Invalid barcode format for type ${type}. Please ensure the barcode is properly formatted.`);
        }

        // Log the exact barcode being processed
        console.log(`🔍 Decoding barcode: "${data}" (type: ${type}, length: ${data.length})`);
        
        userId = await decodeBarcodeToken(data);
        
        if (!userId) {
          console.log('💥 Barcode decoding failed completely');
          throw new Error(`No customer found for barcode: "${data}". Please ensure the customer has generated a valid barcode from their app.`);
        }
      } else {
        console.log('📄 Processing as QR code...');
        userId = validateQRToken(data);
        
        if (!userId) {
          console.log('💥 QR validation failed');
          throw new Error('Invalid QR code. Please ensure the customer has a valid loyalty account.');
        }
      }
      
      console.log('🎯 Extracted userId:', userId);
      
      if (!userId) {
        throw new Error('Could not identify customer. Please try scanning again.');
      }

      console.log('👤 Fetching customer data for userId:', userId);
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('👻 Customer document not found in database');
        throw new Error(`Customer account not found for ID: ${userId}. Please ensure they have a valid loyalty account.`);
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('Invalid customer data received from database.');
      }

      console.log('📋 Customer data fetched successfully:', {
        name: userData.displayName || userData.name,
        points: userData.loyaltyPoints,
        phone: userData.phoneNumber
      });
      
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
      
      setCustomerData(customer);
      setShowBillInput(true);
      
      console.log('✅ Successfully processed scan for:', customer.displayName);

    } catch (error: any) {
      console.error('🚨 Error processing scan:', error);
      
      // More specific error messages
      let errorMessage = error.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Invalid barcode format')) {
        errorMessage = `Barcode format error: The scanned barcode (${type}) is not in a supported format. Please try scanning again.`;
      } else if (errorMessage.includes('No customer found')) {
        errorMessage = `Customer not found for barcode "${data}". Please ensure:\n• Customer has generated barcode from their app\n• Barcode is not expired\n• Customer has an active loyalty account`;
      }
      
      Alert.alert(
        'Scan Failed',
        errorMessage,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setScanned(false);
              setCustomerData(null);
              setShowBillInput(false);
            }
          }
        ]
      );
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
      const userDocRef = doc(db, 'users', scannedUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('Customer data not found');
      }
      
      const freshUserData = userDoc.data();
      const availablePoints = freshUserData.loyaltyPoints || 0;
      
      const pointsDiscount = loyaltyService.calculateMaxRedeemableAmount(availablePoints, amount);
      const customerPays = amount - pointsDiscount;
      const pointsEarned = Math.floor(customerPays / 10);
      const pointsUsed = pointsDiscount;
      const newPointsBalance = availablePoints - pointsUsed + pointsEarned;

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
      setCustomerData(updatedCustomerData);
      setShowConfirmation(true);
      setShowBillInput(false);

    } catch (error) {
      console.error('Error calculating discount:', error);
      Alert.alert('Error', 'Could not calculate discount. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Camera Component with better response handling
  const CameraComponent = () => {
    const [cameraError, setCameraError] = useState<string | null>(null);

    const handleCameraError = (error: Error) => {
      console.error('Camera error:', error);
      setCameraError(error.message);
    };

    const handleCameraReady = () => {
      setCameraError(null);
    };

    if (cameraError) {
      return (
        <View style={styles.cameraErrorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.primaryOrangeHex} />
          <Text style={styles.cameraErrorText}>Camera Error</Text>
          <Text style={styles.cameraErrorSubtext}>{cameraError}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              setCameraError(null);
              refreshCamera();
            }}
          >
            <MaterialIcons name="refresh" size={24} color={COLORS.primaryWhiteHex} />
            <Text style={styles.refreshButtonText}>Refresh Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          key={cameraKey}
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'ean13',
              'ean8',
              'upc_e',
              'code128',
              'code39',
              'code93',
              'itf14',
              'codabar'
            ]
          }}
          onBarcodeScanned={handleBarCodeScanned}
          onCameraReady={() => {
            setCameraError(null);
            console.log('Camera is ready');
          }}
        />
        
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
        </View>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.cameraRefreshButton}
          onPress={refreshCamera}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.primaryWhiteHex} />
        </TouchableOpacity>
      </View>
    );
  };

  const createOfflineOrder = async (preview: TransactionPreview): Promise<string> => {
    try {
      const currentTimestamp = Timestamp.now();
      const orderId = generateReadableOrderId();
      const autoGeneratedId = doc(collection(db, 'orders')).id;

      const orderData: OrderData = {
        id: autoGeneratedId,
        orderId: orderId,
        userId: scannedUserId!,
        items: [],
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
          items: [],
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
      const orderId = await createOfflineOrder(transactionPreview);
      await createLoyaltyTransaction(transactionPreview, orderId);
      await updateCustomerProfile(transactionPreview);
      
      setTransactionComplete(true);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert('Transaction Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startNewScan = () => {
    setScanned(false);
    setScannedUserId(null);
    setCustomerData(null);
    setBillAmount('');
    setShowBillInput(false);
    setShowConfirmation(false);
    setTransactionPreview(null);
    setTransactionComplete(false);
    refreshCamera();
  };

  const handleBackPress = () => {
    if (showBillInput) {
      setShowBillInput(false);
      setScanned(false);
      setCustomerData(null);
      setScannedUserId(null);
      setBillAmount('');
      refreshCamera();
    } else if (showConfirmation) {
      setShowConfirmation(false);
      setShowBillInput(true);
    } else if (transactionComplete) {
      startNewScan();
    } else {
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
        <Text style={styles.text}>Camera access needed to scan codes</Text>
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
          <Text style={styles.headerTitle}>Staff Code Scanner</Text>
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

      {/* Scan Mode Toggle */}
      {!showBillInput && !showConfirmation && !transactionComplete && (
        <View style={styles.scanModeContainer}>
          <TouchableOpacity 
            style={[styles.scanModeButton, scanMode === 'qr' && styles.activeScanMode]}
            onPress={() => scanMode !== 'qr' && toggleScanMode()}
          >
            <MaterialIcons name="qr-code" size={20} color={scanMode === 'qr' ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} />
            <Text style={[styles.scanModeText, scanMode === 'qr' && styles.activeScanModeText]}>QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.scanModeButton, scanMode === 'barcode' && styles.activeScanMode]}
            onPress={() => scanMode !== 'barcode' && toggleScanMode()}
          >
            <MaterialIcons name="view-headline" size={20} color={scanMode === 'barcode' ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} />
            <Text style={[styles.scanModeText, scanMode === 'barcode' && styles.activeScanModeText]}>Barcode</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Instructions */}
      {!showBillInput && !showConfirmation && !transactionComplete && (
        <View style={styles.instructions}>
          <MaterialIcons 
            name={scanMode === 'qr' ? "qr-code-scanner" : "view-headline"} 
            size={32} 
            color={COLORS.primaryWhiteHex} 
          />
          <Text style={styles.instructionTitle}>Ready to Scan</Text>
          <Text style={styles.instructionText}>
            Ask customer to show their {scanMode === 'qr' ? 'QR code' : 'barcode'}
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

      {/* Code Scanner */}
      {!showBillInput && !showConfirmation && !transactionComplete && (
        <CameraComponent />
      )}

      {/* Bill Input Screen */}
      {showBillInput && customerData && (
        <ScrollView style={styles.billInputContainer}>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <MaterialIcons name="person" size={24} color={COLORS.primaryOrangeHex} />
              <Text style={styles.customerName}>{customerData.displayName}</Text>
            </View>
            
            <View style={styles.customerDetails}>
              {customerData.phoneNumber && (
                <Text style={styles.customerDetail}>📱 {customerData.phoneNumber}</Text>
              )}
              {customerData.email && (
                <Text style={styles.customerDetail}>✉️ {customerData.email}</Text>
              )}
              <Text style={styles.loyaltyPoints}>
                💎 Available Points: {customerData.loyaltyPoints}
              </Text>
            </View>
          </View>

          <View style={styles.billInputCard}>
            <Text style={styles.billInputTitle}>Enter Bill Amount</Text>
            <TextInput
              style={styles.billInput}
              value={billAmount}
              onChangeText={setBillAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.primaryLightGreyHex}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.currencyLabel}>₹</Text>
          </View>

          <TouchableOpacity
            style={[styles.calculateButton, (!billAmount || loading) && styles.disabledButton]}
            onPress={handleBillSubmit}
            disabled={!billAmount || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primaryWhiteHex} />
            ) : (
              <Text style={styles.calculateButtonText}>Calculate Discount</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Transaction Confirmation */}
      {showConfirmation && transactionPreview && (
        <ScrollView style={styles.confirmationContainer}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Transaction Summary</Text>
            
            <View style={styles.customerSummary}>
              <Text style={styles.customerSummaryName}>{transactionPreview.customerData.displayName}</Text>
              <Text style={styles.customerSummaryPoints}>
                Available Points: {transactionPreview.availablePoints}
              </Text>
            </View>

            <View style={styles.amountBreakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Bill Amount:</Text>
                <Text style={styles.breakdownValue}>₹{transactionPreview.billAmount.toFixed(2)}</Text>
              </View>
              
              {transactionPreview.pointsDiscount > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, styles.discountLabel]}>Points Discount:</Text>
                  <Text style={[styles.breakdownValue, styles.discountValue]}>
                    -₹{transactionPreview.pointsDiscount.toFixed(2)}
                  </Text>
                </View>
              )}
              
              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Customer Pays:</Text>
                <Text style={styles.totalValue}>₹{transactionPreview.customerPays.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.pointsBreakdown}>
              <Text style={styles.pointsTitle}>Points Transaction</Text>
              
              {transactionPreview.pointsUsed > 0 && (
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsLabel}>Points Used:</Text>
                  <Text style={[styles.pointsValue, styles.pointsUsed]}>
                    -{transactionPreview.pointsUsed}
                  </Text>
                </View>
              )}
              
              <View style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>Points Earned:</Text>
                <Text style={[styles.pointsValue, styles.pointsEarned]}>
                  +{transactionPreview.pointsEarned}
                </Text>
              </View>
              
              <View style={[styles.pointsRow, styles.newBalanceRow]}>
                <Text style={styles.pointsLabel}>New Balance:</Text>
                <Text style={styles.newBalanceValue}>{transactionPreview.newPointsBalance}</Text>
              </View>
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
              onPress={processTransaction}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Transaction</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Transaction Complete */}
      {transactionComplete && transactionPreview && (
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <MaterialIcons name="check-circle" size={64} color={COLORS.primaryGreenHex} />
            <Text style={styles.successTitle}>Transaction Complete!</Text>
            
            <View style={styles.successSummary}>
              <Text style={styles.successCustomer}>{transactionPreview.customerData.displayName}</Text>
              <Text style={styles.successAmount}>Paid: ₹{transactionPreview.customerPays.toFixed(2)}</Text>
              {transactionPreview.pointsDiscount > 0 && (
                <Text style={styles.successDiscount}>
                  Saved: ₹{transactionPreview.pointsDiscount.toFixed(2)} with points
                </Text>
              )}
              <Text style={styles.successNewBalance}>
                New Points Balance: {transactionPreview.newPointsBalance}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.newScanButton} onPress={startNewScan}>
            <MaterialIcons name="qr-code-scanner" size={24} color={COLORS.primaryWhiteHex} />
            <Text style={styles.newScanButtonText}>Scan Next Customer</Text>
          </TouchableOpacity>
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
    paddingVertical: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
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
  },
  scanModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
  },
  scanModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_8,
    marginHorizontal: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_20,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  activeScanMode: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  scanModeText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_4,
  },
  activeScanModeText: {
    color: COLORS.primaryWhiteHex,
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_20,
  },
  instructionTitle: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_12,
  },
  instructionText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_8,
  },
  subInstructionText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_4,
  },
  scanAgainButton: {
    marginTop: SPACING.space_16,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  scanAgainText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryOrangeHex,
  },
  cameraContainer: {
    flex: 1,
    margin: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primaryBlackRGBA,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_12,
  },
  billInputContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  customerCard: {
    margin: SPACING.space_20,
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 3,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_12,
  },
  customerName: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_8,
  },
  customerDetails: {
    marginTop: SPACING.space_8,
  },
  customerDetail: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_4,
  },
  loyaltyPoints: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_8,
  },
  billInputCard: {
    margin: SPACING.space_20,
    marginTop: 0,
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 3,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'relative',
  },
  billInputTitle: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_12,
  },
  billInput: {
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_12,
    paddingLeft: SPACING.space_20,
    textAlign: 'center',
  },
  currencyLabel: {
    position: 'absolute',
    left: SPACING.space_20,
    bottom: SPACING.space_32,
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryGreyHex,
  },
  calculateButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    marginHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.primaryGreyHex,
  },
  calculateButtonText: {
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
    padding: SPACING.space_20,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    elevation: 3,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmationTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: SPACING.space_20,
  },
  customerSummary: {
    alignItems: 'center',
    marginBottom: SPACING.space_20,
    paddingBottom: SPACING.space_16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  customerSummaryName: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  customerSummaryPoints: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_4,
  },
  amountBreakdown: {
    marginBottom: SPACING.space_20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_8,
  },
  breakdownLabel: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
  },
  breakdownValue: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  discountLabel: {
    color: COLORS.primaryGreenHex,
  },
  discountValue: {
    color: COLORS.primaryGreenHex,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
    paddingTop: SPACING.space_12,
  },
  totalLabel: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  totalValue: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryOrangeHex,
  },
  pointsBreakdown: {
    backgroundColor: COLORS.secondaryLightGreyHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_10,
  },
  pointsTitle: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_12,
    textAlign: 'center',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_4,
  },
  pointsLabel: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
  },
  pointsValue: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  pointsUsed: {
    color: COLORS.primaryRedHex,
  },
  pointsEarned: {
    color: COLORS.primaryGreenHex,
  },
  newBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
    marginTop: SPACING.space_8,
    paddingTop: SPACING.space_8,
  },
  newBalanceValue: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryOrangeHex,
  },
  confirmationButtons: {
    flexDirection: 'row',
    marginHorizontal: SPACING.space_20,
    marginBottom: SPACING.space_20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.space_16,
    marginRight: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryGreyHex,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.space_16,
    marginLeft: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryOrangeHex,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_30,
    margin: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    elevation: 5,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  successTitle: {
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryGreenHex,
    marginTop: SPACING.space_16,
    marginBottom: SPACING.space_20,
  },
  successSummary: {
    alignItems: 'center',
  },
  successCustomer: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  successAmount: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_4,
  },
  successDiscount: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryGreenHex,
    marginBottom: SPACING.space_8,
  },
  successNewBalance: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_30,
    paddingVertical: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    marginTop: SPACING.space_20,
  },
  newScanButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
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
    paddingHorizontal: SPACING.space_30,
    paddingVertical: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  cameraErrorContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_20,
  },
  cameraErrorText: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_12,
  },
  cameraErrorSubtext: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_15,
    marginTop: SPACING.space_20,
  },
  refreshButtonText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
  },
  cameraRefreshButton: {
    position: 'absolute',
    top: SPACING.space_16,
    right: SPACING.space_16,
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_25,
    elevation: 5,
    shadowColor: COLORS.primaryBlackHex,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default StaffQRScannerScreen;