// app/(app)/StaffRedemptionScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';

const StaffRedemptionScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Redemption</Text>
      </View>

      <View style={styles.content}>
        <MaterialIcons name="redeem" size={80} color={COLORS.primaryOrangeHex} />
        <Text style={styles.text}>Redemption Screen</Text>
        <Text style={styles.subText}>
          This screen would contain redemption functionality for rewards and offers
        </Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    textAlign: 'center',
  },
});

export default StaffRedemptionScreen;