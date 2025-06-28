// app/(app)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Text as RNText } from 'react-native';
// useRouter is imported but not used in the provided snippets. Keep if used elsewhere.
import { useRouter } from 'expo-router'; 
import FloatingQRModal from '../../src/components/FloatingQRModal';

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
  'CartScreen',
  'OrderScreen',
  'StaffQRScannerScreen', 
  'StaffRedemptionScreen',
  'PaymentScreen',
  'OrderStatusScreen',
  'products/[id]', // Dynamic route
  'category/[category]', // Dynamic route
  'FavoritesScreen',
  'SearchScreen',
  'AddressScreen',
  'SupportScreen',
  'NotificationSettings',
  'EditProfileScreen',
  'NotificationScreen',
  'explore',
  'HomeScreen1', // Double check if you have HomeScreen and HomeScreen1
  'OffersScreen',
  'LoyaltyQRCodeScreen',
  'HowToEarnScreen'
];

// Floating QR Scanner Button Component
const FloatingQRButton = ({ onPress }: { onPress: () => void }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const ringAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Continuous pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Ring pulse animation
    const ringAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    ringAnimation.start();

    return () => {
      pulseAnimation.stop();
      ringAnimation.stop();
    };
  }, []);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger modal instead of navigation
    onPress();
  };

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={styles.floatingButtonContainer}>
      {/* Animated Ring Effect */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      
      {/* Main Floating Button */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              { scale: Animated.multiply(pulseAnim, scaleAnim) }
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name="qr-code-scanner" 
            size={28} 
            color={COLORS.primaryWhiteHex} 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation, onQRPress }: any) => {
  return (
    <View style={styles.customTabBar}>
      {/* Regular Tab Buttons */}
      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // The `navigation.navigate` from react-navigation tabs should work correctly here.
              // For expo-router, if you want to navigate by path, you might use `router.push(route.name)`
              navigation.navigate(route.name);
            }
          };

          const tabConfig = mainTabs.find(tab => tab.name === route.name);
          if (!tabConfig) return null; // Should not happen if mainTabs are correctly configured

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabButton}
            >
              <MaterialIcons
                name={tabConfig.icon}
                size={24}
                color={isFocused ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex}
              />
              <RNText
                style={[
                  styles.tabBarLabel,
                  {
                    color: isFocused ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex,
                  },
                ]}
              >
                {label}
              </RNText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating QR Button */}
      <FloatingQRButton onPress={onQRPress} />
    </View>
  );
};

// This is the default export for app/(app)/_layout.tsx
const AppLayout = () => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const openQRModal = () => {
    setModalVisible(true);
  };

  const closeQRModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        // Pass the openQRModal function to your custom tab bar
        tabBar={(props) => <CustomTabBar {...props} onQRPress={openQRModal} />}
      >
        {/* Main tab screens (visible in tab bar) */}
        {mainTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
            }}
          />
        ))}

        {/* Hidden screens (not visible in tab bar, but accessible by navigation) */}
        {hiddenScreens.map((screenName) => (
          <Tabs.Screen
            key={screenName}
            name={screenName}
            options={{
              href: null, // This properly hides the screen from tab bar/direct routing via `name`
              headerShown: false, // Ensure header is hidden for these screens too
            }}
          />
        ))}
      </Tabs>

      {/* Floating QR Modal - This component is outside the Tabs navigator but still part of the layout */}
      <FloatingQRModal 
        visible={modalVisible} 
        onClose={closeQRModal}
      />
    </>
  );
};

// Finally, export the AppLayout as the default export for this file.
export default AppLayout;

const styles = StyleSheet.create({
  customTabBar: {
    position: 'relative',
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    height: 60,
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarContent: {
    flexDirection: 'row',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabBarLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 10,
    marginTop: 2,
  },
  floatingButtonContainer: {
    position: 'absolute',
    top: -25, // Adjust this value to control how much it overlaps the tab bar
    left: '50%',
    marginLeft: -30, // Half of width (60 / 2) to center it
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryOrangeHex,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryOrangeHex,
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: COLORS.primaryWhiteHex,
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
