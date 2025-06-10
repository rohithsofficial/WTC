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
import { LoyaltyService } from '../../src/services/loyaltyService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RedemptionResult {
  userName: string;
  membershipTier: string;
  orderAmount: number;
  discountApplied: number;
  pointsUsed: number;
  remainingPoints: number;
  error?: string;
}

const StaffQRScannerScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [showAmountInput, setShowAmountInput] = useState(false);
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

  const processRedemption = async () => {
    if (!scannedUserId || !orderAmount) {
      Alert.alert('Error', 'Please enter a valid order amount');
      return;
    }

    const amount = parseFloat(orderAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Order amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // First get the user's current points and tier from users collection
      const userDocRef = doc(db, 'users', scannedUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const currentPoints = userData.loyaltyPoints || 0;
      const membershipTier = userData.membershipTier || 'Bronze';
      const userName = userData.displayName || 'Customer';

      // Calculate the best discount option
      const bestOption = LoyaltyService.getBestAvailableDiscount(
        amount,
        membershipTier,
        currentPoints,
        currentPoints // Use all available points for redemption
      );

      if (bestOption.recommendedOption === 'none') {
        throw new Error('No discount options available');
      }

      // Process the redemption using LoyaltyService
      const result = await LoyaltyService.redeemPoints(scannedUserId, amount);
      
      // Update the result with the correct user name and points
      setRedemptionResult({
        ...result,
        userName: userName,
        remainingPoints: currentPoints - (result.pointsUsed || 0)
      });
    } catch (error) {
      console.error('Redemption error:', error);
      Alert.alert(
        'Redemption Failed',
        error instanceof Error ? error.message : 'Failed to process redemption'
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
           {(showAmountInput || redemptionResult) && (
             <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
               <MaterialIcons name="refresh" size={24} color={COLORS.primaryOrangeHex} />
             </TouchableOpacity>
           )}
         </View>
         
      {!showAmountInput && !redemptionResult && (
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

      {showAmountInput && !redemptionResult && (
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
              onPress={processRedemption}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.processButtonText}>Process Redemption</Text>
              )}
            </TouchableOpacity>
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
                <Text style={styles.successTitle}>Redemption Successful!</Text>
                
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
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Discount Applied:</Text>
                    <Text style={[styles.detailValue, styles.discountValue]}>
                      -₹{redemptionResult.discountApplied.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points Used:</Text>
                    <Text style={styles.detailValue}>{redemptionResult.pointsUsed}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remaining Points:</Text>
                    <Text style={styles.detailValue}>{redemptionResult.remainingPoints}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.finalAmountRow}>
                    <Text style={styles.finalAmountLabel}>Final Amount:</Text>
                    <Text style={styles.finalAmountValue}>
                      ₹{(redemptionResult.orderAmount - redemptionResult.discountApplied).toFixed(2)}
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

      {!showAmountInput && !redemptionResult && (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: SPACING.space_8,
  },
  resetButton: {
    padding: SPACING.space_8,
  },
  headerTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    flex: 1,
    textAlign: 'center',
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
    borderWidth: 3,
    borderColor: COLORS.primaryOrangeHex,
    backgroundColor: 'transparent',
    borderRadius: BORDERRADIUS.radius_15,
  },
  scanInstruction: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryWhiteHex,
    textAlign: 'center',
    marginTop: SPACING.space_20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_10,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  inputSection: {
    padding: SPACING.space_24,
  },
  inputLabel: {
    fontSize: FONTSIZE.size_18,
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