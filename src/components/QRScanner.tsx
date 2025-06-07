import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { COLORS, FONTSIZE, SPACING } from '../theme/theme';
import { LoyaltyService } from '../services/loyaltyService';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  onScanSuccess: (userId: string) => void;
  onScanError: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Validate the scanned data is a valid user ID
      const profile = await LoyaltyService.getUserProfile(data);
      
      if (profile) {
        onScanSuccess(data);
      } else {
        onScanError('Invalid QR code. No loyalty profile found.');
      }
    } catch (error) {
      onScanError('Error scanning QR code. Please try again.');
    } finally {
      // Reset scan after 2 seconds
      setTimeout(() => setScanned(false), 2000);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => Camera.requestCameraPermissionsAsync()}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={CameraType.back}
        barCodeScannerSettings={{
          barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
        }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}>
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Position the QR code within the frame
          </Text>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
    backgroundColor: 'transparent',
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    textAlign: 'center',
    padding: SPACING.space_20,
  },
  text: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    marginBottom: SPACING.space_20,
  },
  button: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_15,
    borderRadius: SPACING.space_10,
  },
  buttonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
  },
});

export default QRScanner; 