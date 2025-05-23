import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../../src/firebase/config';

const AppLayout = () => {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/(auth)/login');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.primaryWhiteHex,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: FONTFAMILY.poppins_medium,
          fontSize: 12,
          marginBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primaryOrangeHex,
        tabBarInactiveTintColor: COLORS.primaryGreyHex,
      }}
    >
      {/* Main Tab Bar Items */}
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="MenuScreen"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="restaurant-menu" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="CartScreen"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="shopping-cart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="OrderScreen"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="receipt-long" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profileScreen"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
      
      {/* Hidden Screens (accessible via navigation but not in tab bar) */}
      <Tabs.Screen
        name="styles"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="PaymentScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ProductsScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="OrderStatusScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="FavoritesScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="SearchScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="product-detail/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="product/[category]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="AddressScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="SupportScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="NotificationSettings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="EditProfileScreen"
        options={{
          href: null,
        }}
      />
       <Tabs.Screen
        name="Profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default AppLayout;
