//app/(app)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS, FONTFAMILY } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Text as RNText } from 'react-native';
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
    name: 'placeholder', // Placeholder for floating button space
    title: '',
    icon: 'circle' as const
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
          const isPlaceholder = route.name === 'placeholder';

          if (isPlaceholder) {
            // Empty space for floating button
            return <View key={route.key} style={styles.placeholderSpace} />;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const tabConfig = mainTabs.find(tab => tab.name === route.name);
          if (!tabConfig) return null;

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
        tabBar={(props) => <CustomTabBar {...props} onQRPress={openQRModal} />}
      >
        {/* Main tab screens */}
        {mainTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              ...(tab.name === 'placeholder' && {
                href: null, // Hide placeholder from routing
              }),
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

      {/* Floating QR Modal */}
      <FloatingQRModal 
        visible={modalVisible} 
        onClose={closeQRModal}
      />
    </>
  );
};

const styles = StyleSheet.create({
  customTabBar: {
    position: 'relative',
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    height: 60,
    elevation: 8,
    shadowColor: '#000',
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
  placeholderSpace: {
    flex: 1,
  },
  tabBarLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 10,
    marginTop: 2,
  },
  floatingButtonContainer: {
    position: 'absolute',
    top: -25,
    left: '50%',
    marginLeft: -30,
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
    elevation: 8,
    shadowColor: '#000',
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

export default AppLayout;