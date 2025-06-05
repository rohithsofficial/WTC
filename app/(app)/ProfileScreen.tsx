import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { auth, db } from '../../src/firebase/config';
import { FontAwesome } from '@expo/vector-icons';
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

  const menuItems = [
    { title: 'My Orders', icon: 'shopping-bag' as const, onPress: () => router.push('/(app)/OrderScreen') },
    { title: 'Loyalty Points', icon: 'star' as const, onPress: () => router.push('/(app)/LoyaltyScreen') },
    { title: 'Payment Methods', icon: 'credit-card' as const, onPress: () => router.push('/(app)/PaymentScreen') },
    { title: 'Favorites', icon: 'heart' as const, onPress: () => router.push('/(app)/FavoritesScreen') },
    { title: 'Addresses', icon: 'map-marker' as const, onPress: () => router.push('/(app)/AddressScreen') },
    { title: 'Notifications Setting', icon: 'bell' as const, onPress: () => router.push('/(app)/NotificationSettings') },
    { title: 'Notifications', icon: 'bell' as const, onPress: () => router.push('/(app)/NotificationScreen') },
    { title: 'Explore Cafe', icon: 'coffee' as const, onPress: () => router.push('/(app)/explore') },
    { title: 'Help & Support', icon: 'question-circle' as const, onPress: () => router.push('/(app)/SupportScreen') }, 
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />

      <StyledAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                user?.photoURL
                  ? { uri: user.photoURL }
                  : require('../../assets/icon.png')
              }
              style={styles.profileImage}
            />
            {user && (
              <TouchableOpacity style={styles.editImageButton}>
                <FontAwesome name="camera" size={16} color={COLORS.primaryWhiteHex} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.userName}>{userData?.displayName || 'Guest'}</Text>
          <Text style={styles.userEmail}>{userData?.phoneNumber || 'Not logged in'}</Text>

          {user && (
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <FontAwesome name="edit" size={16} color={COLORS.primaryWhiteHex} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <FontAwesome name={item.icon} size={20} color={COLORS.primaryOrangeHex} />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={COLORS.primaryGreyHex} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={user ? handleSignOut : handleLogin}
        >
          <FontAwesome
            name={user ? 'sign-out' : 'sign-in'}
            size={20}
            color={COLORS.primaryWhiteHex}
          />
          <Text style={styles.signOutText}>{user ? 'Sign Out' : 'Login'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryWhiteHex },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: SPACING.space_24, paddingTop: SPACING.space_36 },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
  },
  scrollView: { flex: 1 },
  profileSection: {
    alignItems: 'center',
    padding: SPACING.space_24,
  },
  profileImageContainer: { position: 'relative', marginBottom: SPACING.space_16 },
  profileImage: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryGreyHex,
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
    borderColor: COLORS.primaryWhiteHex,
  },
  userName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  userEmail: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
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
  menuSection: {
    backgroundColor: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_16,
    paddingHorizontal: SPACING.space_24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryGreyHex + '20',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_16,
  },
  menuItemText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_16,
    marginHorizontal: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_15,
    marginTop: SPACING.space_24,
    gap: SPACING.space_12,
  },
  signOutText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default ProfileScreen;
