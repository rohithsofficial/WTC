import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { auth, db } from '../../src/firebase/firebase-config';

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newProducts: boolean;
  deliveryUpdates: boolean;
  systemNotifications: boolean;
}

const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: true,
    newProducts: true,
    deliveryUpdates: true,
    systemNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists() && userDoc.data()?.notificationSettings) {
        setSettings(userDoc.data()!.notificationSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    try {
      setSaving(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please sign in to update settings');
        return;
      }

      const newSettings = {
        ...settings,
        [key]: !settings[key],
      };

      await db.collection('users').doc(userId).set({
        notificationSettings: newSettings,
      }, { merge: true });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    key: keyof NotificationSettings,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <FontAwesome name={icon as any} size={24} color={COLORS.primaryOrangeHex} />

      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: COLORS.primaryGreyHex + '40', true: COLORS.primaryOrangeHex + '40' }}
        thumbColor={settings[key] ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex}
        disabled={saving}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notification Settings',
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'Order Updates',
              'Get notified about your order status and delivery',
              'orderUpdates',
              'shopping-bag'
            )}
            {renderSettingItem(
              'Promotions',
              'Receive special offers and discounts',
              'promotions',
              'gift'
            )}
            {renderSettingItem(
              'New Products',
              'Be the first to know about new menu items',
              'newProducts',
              'star'
            )}
            {renderSettingItem(
              'Delivery Updates',
              'Get real-time updates about your delivery',
              'deliveryUpdates',
              'truck'
            )}
            {renderSettingItem(
              'System Notifications',
              'Important updates about the app and your account',
              'systemNotifications',
              'bell'
            )}
          </View>
        </ScrollView>
      )}
    </View>
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
    padding: SPACING.space_24,
    paddingTop: SPACING.space_36,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  headerRight: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContainer: {
    padding: SPACING.space_16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryOrangeHex + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.space_16,
  },
  settingContent: {
    flex: 1,
    marginRight: SPACING.space_16,
  },
  settingTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  settingDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
});

export default NotificationSettings;