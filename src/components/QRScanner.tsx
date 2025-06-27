import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  onScanSuccess: (userId: string) => void;
  onScanError: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  // QR scanning is not available. Show a placeholder.
  return (
    <View style={styles.container}>
      <Text style={styles.text}>QR scanning is not available in this build.</Text>
      {/* TODO: Implement QR scanning with a supported library */}
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