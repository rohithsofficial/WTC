import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../theme/theme';
import { FontAwesome } from '@expo/vector-icons';

interface StyledAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const StyledAlert: React.FC<StyledAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'times-circle';
      default:
        return 'info-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50'; // Material Design Green
      case 'error':
        return '#F44336'; // Material Design Red
      default:
        return '#2196F3'; // Material Design Blue
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#E8F5E9'; // Light Green
      case 'error':
        return '#FFEBEE'; // Light Red
      default:
        return '#E3F2FD'; // Light Blue
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.alertContainer, { backgroundColor: getBackgroundColor() }]}>
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
            <FontAwesome
              name={getIcon()}
              size={32}
              color={getIconColor()}
            />
          </View>
          <Text style={[styles.title, { color: getIconColor() }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: getIconColor() }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '85%',
    padding: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  title: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    marginBottom: SPACING.space_8,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: '#424242',
    marginBottom: SPACING.space_24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_32,
    borderRadius: BORDERRADIUS.radius_10,
    minWidth: 120,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default StyledAlert; 