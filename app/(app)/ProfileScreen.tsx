// app/(app)/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../src/firebase/config';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
  BORDERRADIUS,
} from '../../src/theme/theme';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import StyledAlert from '../../src/components/StyledAlert';

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            unsubscribeSnapshot = onSnapshot(
              userDocRef,
              (doc) => {
                if (doc.exists()) {
                  setUserData(doc.data());
                } else {
                  setUserData(null);
                }
                setLoading(false);
              },
              (error) => {
                console.error('Error fetching user data:', error);
                showAlert('Error', 'Failed to load user data', 'error');
                setLoading(false);
              }
            );
          } else {
            setUserData(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error getting user doc:', error);
          showAlert('Error', 'Something went wrong', 'error');
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({
      visible: true,
      title,
      message,
      type,
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.replace('/(auth)/phone-auth');
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Error', 'Failed to sign out', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.replace('/(auth)/phone-auth');
  };

  const handleEditProfile = () => {
    router.push('/(app)/EditProfileScreen');
  };

  const handleOptionPress = (screen: string) => {
    router.push(screen as any);
  };

  // Staff functions
  const openStaffQRScanner = () => {
    router.push('/StaffQRScannerScreen');
  };
  
  const openStaffLoyaltyScanner = () => {
    router.push('/StaffLoyaltyScannerScreen');
  };
  
  const openStaffRedemption = () => {
    router.push('/StaffRedemptionScreen');
  };

  // Enhanced profile options combining both screens
  const profileOptions = [
    // {
    //   id: 'loyalty-qr',
    //   title: 'My Loyalty Card',
    //   subtitle: 'Show QR code to earn points',
    //   icon: 'qr-code',
    //   screen: '/(app)/LoyaltyScreen',
    //   highlighted: true,
    //   category: 'loyalty'
    // },
    {
      id: 'loyalty-history',
      title: 'Points History',
      subtitle: 'View your transaction history',
      icon: 'time',
      highlighted: true,
      screen: '/(app)/LoyaltyScreen',
      category: 'loyalty'
    },
    {
      id: 'rewards',
      title: 'Available Rewards',
      subtitle: 'Redeem your points',
      icon: 'gift',
      screen: '/(app)/RewardsScreen',
      category: 'loyalty'
    },
    {
      id: 'cart',
      title: 'My Cart',
      subtitle: 'View items in your cart',
      icon: 'cart-outline',
      screen: '/(app)/CartScreen',
      category: 'Settings'
    },
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'View order history',
      icon: 'receipt',
      screen: '/(app)/OrderScreen',
      category: 'account'
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved items',
      icon: 'heart',
      screen: '/(app)/FavoritesScreen',
      category: 'account'
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      subtitle: 'Manage payment options',
      icon: 'card',
      screen: '/(app)/PaymentScreen',
      category: 'account'
    },
    {
      id: 'addresses',
      title: 'Addresses',
      subtitle: 'Delivery locations',
      icon: 'location',
      screen: '/(app)/AddressScreen',
      category: 'account'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'View messages',
      icon: 'notifications',
      screen: '/(app)/NotificationScreen',
      category: 'settings'
    },
    {
      id: 'notification-settings',
      title: 'Notification Settings',
      subtitle: 'Manage preferences',
      icon: 'settings',
      screen: '/(app)/NotificationSettings',
      category: 'settings'
    },
    {
      id: 'explore',
      title: 'Explore Cafe',
      subtitle: 'Discover menu items',
      icon: 'cafe',
      screen: '/(app)/explore',
      category: 'discover'
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      icon: 'help-circle',
      screen: '/(app)/SupportScreen',
      category: 'support'
    },
  ];

  // Staff menu items
  const staffMenuItems = [
    { title: 'Staff QR Scanner', icon: 'qr-code', onPress: openStaffQRScanner },
    { title: 'Staff Redemption', icon: 'gift', onPress: openStaffRedemption },
  ];

  // Check if user is staff
  const isStaff = userData?.role === 'staff' || userData?.isStaff === true;

  // Get loyalty options for quick access
  const loyaltyOptions = profileOptions.filter(option => option.category === 'loyalty');
  const accountOptions = profileOptions.filter(option => option.category === 'account');
  const settingsOptions = profileOptions.filter(option => option.category === 'settings');
  const otherOptions = profileOptions.filter(option => !['loyalty', 'account', 'settings'].includes(option.category));

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryBlackHex} />
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryBlackHex} />
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />

      <StyledAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={styles.profileImage}
              />
            ) : (
              <Ionicons 
                name="person-circle" 
                size={100} 
                color={COLORS.primaryOrangeHex} 
              />
            )}
            {user && (
              <TouchableOpacity style={styles.editImageButton} onPress={handleEditProfile}>
                <Ionicons name="camera" size={16} color={COLORS.primaryWhiteHex} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.userName}>
            {userData?.displayName || user?.displayName || user?.email || 'Guest'}
          </Text>
          <Text style={styles.userEmail}>
            {userData?.phoneNumber || user?.email || 'Not logged in'}
          </Text>

          {user && (
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Ionicons name="create" size={16} color={COLORS.primaryWhiteHex} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        {user && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.loyaltyPoints || '0'}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.totalOrders || '0'}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
          </View>
        )}

        {/* Quick QR Access */}
        {user && (
          <TouchableOpacity
            style={styles.quickQRButton}
            onPress={() => handleOptionPress('/(app)/LoyaltyQRCodeScreen')}
          >
            <Ionicons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
            <Text style={styles.quickQRText}>Show QR code to earn points</Text>
          </TouchableOpacity>
        )}

        {/* Loyalty Section */}
        {user && loyaltyOptions.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Loyalty & Rewards</Text>
            {loyaltyOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  option.highlighted && styles.highlightedOption
                ]}
                onPress={() => handleOptionPress(option.screen)}
              >
                <View style={styles.optionLeft}>
                  <View style={[
                    styles.optionIcon,
                    option.highlighted && styles.highlightedIcon
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={option.highlighted ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[
                      styles.optionTitle,
                      option.highlighted && styles.highlightedTitle
                    ]}>
                      {option.title}
                    </Text>
                    <Text style={[
                      styles.optionSubtitle,
                      option.highlighted && styles.highlightedSubtitle
                    ]}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={option.highlighted ? COLORS.primaryWhiteHex : COLORS.primaryLightGreyHex}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Account Section */}
        {user && accountOptions.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Account</Text>
            {accountOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => handleOptionPress(option.screen)}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={COLORS.primaryOrangeHex}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.primaryLightGreyHex}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Settings & Other */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings & More</Text>
          {[...settingsOptions, ...otherOptions].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={() => handleOptionPress(option.screen)}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={COLORS.primaryOrangeHex}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.primaryLightGreyHex}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Staff Section */}
        {isStaff && (
          <View style={styles.staffSection}>
            <Text style={styles.staffSectionTitle}>Staff Tools</Text>
            {staffMenuItems.map((item, index) => (
              <TouchableOpacity 
                key={`staff-${index}`} 
                style={styles.staffMenuItem} 
                onPress={item.onPress}
              >
                <View style={styles.staffMenuItemLeft}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primaryWhiteHex} />
                  <Text style={styles.staffMenuItemText}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primaryWhiteHex} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sign Out/Login Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={user ? handleSignOut : handleLogin}
        >
          <Ionicons
            name={user ? 'log-out' : 'log-in'}
            size={20}
            color={COLORS.primaryWhiteHex}
          />
          <Text style={styles.signOutText}>{user ? 'Sign Out' : 'Login'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryCoffee,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.space_20,
    paddingTop: SPACING.space_30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.space_15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryGreyHex,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primaryOrangeHex,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryBlackHex,
  },
  userName: {
    color: COLORS.primaryBlackHex,
    fontSize: FONTSIZE.size_24,
    fontFamily: FONTFAMILY.poppins_semibold,
    marginBottom: SPACING.space_4,
  },
  userEmail: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_regular,
    marginBottom: SPACING.space_16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_15,
    gap: SPACING.space_8,
  },
  editProfileText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDarkGreyHex,
    margin: SPACING.space_20,
    padding: SPACING.space_20,
    borderRadius: SPACING.space_15,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primaryOrangeHex,
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    marginBottom: SPACING.space_4,
  },
  statLabel: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.primaryGreyHex,
    marginHorizontal: SPACING.space_10,
  },
  quickQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    margin: SPACING.space_20,
    padding: SPACING.space_15,
    borderRadius: SPACING.space_15,
    marginTop: SPACING.space_10,
  },
  quickQRText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    marginLeft: SPACING.space_10,
  },
  sectionContainer: {
    margin: SPACING.space_20,
  },
  sectionTitle: {
    color: COLORS.primaryBlackHex,
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    marginBottom: SPACING.space_15,
    paddingLeft: SPACING.space_4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDarkGreyHex,
    padding: SPACING.space_15,
    borderRadius: SPACING.space_10,
    marginBottom: SPACING.space_10,
  },
  highlightedOption: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBlackHex,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.space_15,
  },
  highlightedIcon: {
    backgroundColor: COLORS.primaryWhiteHex,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_medium,
    marginBottom: SPACING.space_2,
  },
  highlightedTitle: {
    color: COLORS.primaryWhiteHex,
  },
  optionSubtitle: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
  },
  highlightedSubtitle: {
    color: COLORS.primaryWhiteHex,
    opacity: 0.8,
  },
  staffSection: {
    backgroundColor: COLORS.primaryOrangeHex,
    marginHorizontal: SPACING.space_20,
    marginBottom: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
  },
  staffSectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_12,
    textAlign: 'center',
  },
  staffMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryWhiteHex + '30',
  },
  staffMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_16,
  },
  staffMenuItemText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_16,
    marginHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_20,
    gap: SPACING.space_12,
  },
  signOutText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default ProfileScreen;