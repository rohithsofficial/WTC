
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
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StaffQRScannerScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    Alert.alert(
      'QR Code Scanned',
      `Data: ${data}`,
      [
        {
          text: 'Scan Again',
          onPress: () => setScanned(false),
        },
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
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
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417'],
          }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Point your camera at a QR code to scan
        </Text>
        {scanned && (
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
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
    backgroundColor: 'transparent',
  },
  instructions: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
  },
  instructionText: {
    fontSize: 16,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: 10,
  },
  scanAgainButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  scanAgainText: {
    color: COLORS.primaryWhiteHex,
    fontSize: 14,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  text: {
    fontSize: 18,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: 16,
    fontFamily: FONTFAMILY.poppins_medium,
  },
});

export default StaffQRScannerScreen;