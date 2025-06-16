// app/(app)/_layout.tsx - Clean Tab Layout
import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

// Only define the actual tab screens
const mainTabs = [
  {
    name: 'HomeScreen',
    title: 'Home',
    icon: 'home' as const
  },
  {
    name: 'MenuScreen', 
    title: 'Menu',
    icon: 'restaurant-menu' as const
  },
  {
    name: 'CartScreen',
    title: 'Cart', 
    icon: 'shopping-cart' as const
  },
  {
    name: 'LoyaltyScreen',
    title: 'Loyalty',
    icon: 'stars' as const
  },
  {
    name: 'ProfileScreen',
    title: 'Profile',
    icon: 'person' as const
  }
];

// Hidden screens that shouldn't appear in tab bar
const hiddenScreens = [
  'OrderScreen',
  'StaffQRScannerScreen', 
  'StaffLoyaltyScannerScreen',
  'StaffRedemptionScreen',
  'PaymentScreen',
  'OrderStatusScreen',
  'products/[id]',
  'category/[category]',
  'FavoritesScreen',
  'SearchScreen',
  'AddressScreen',
  'SupportScreen',
  'NotificationSettings',
  'EditProfileScreen',
  'NotificationScreen',
  'explore',
  'HomeScreen1',
  'OffersScreen',
  'LoyaltyQRCodeScreen',
  'ProductsScreen',
  'HowToEarnScreen'
];

const AppLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: COLORS.primaryOrangeHex,
        tabBarInactiveTintColor: COLORS.primaryGreyHex,
      }}
    >
      {/* Main tab screens */}
      {mainTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size = 24 }) => (
              <MaterialIcons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}

      {/* Hidden screens - no tab bar buttons */}
      {hiddenScreens.map((screenName) => (
        <Tabs.Screen
          key={screenName}
          name={screenName}
          options={{
            href: null, // This properly hides the screen from tab bar
          }}
        />
      ))}
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    height: 60,
    elevation: 0,
    shadowOpacity: 0,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 12,
    marginTop: 4,
  },
});

export default AppLayout;