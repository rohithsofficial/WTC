import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';

const AppLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.primaryBlackHex,
          borderTopWidth: 1,
          borderTopColor: COLORS.primaryGreyHex,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: FONTFAMILY.poppins_medium,
          fontSize: 12,
          marginBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primaryOrangeHex,
        tabBarInactiveTintColor: COLORS.primaryLightGreyHex,
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
        name="profile"
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
        name="product-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default AppLayout;
