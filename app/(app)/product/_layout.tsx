import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';


const ProductDetailLayout = () => {
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
        <Tabs.Screen
              name="[id]"
              options={{
                href: null,
              }}
            />
    </Tabs>
  );
};

export default ProductDetailLayout;
