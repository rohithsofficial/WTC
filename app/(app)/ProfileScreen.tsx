import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { auth, db } from '../../src/firebase/config';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import StyledAlert from '../../src/components/StyledAlert';

const ProfileScreen = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // If no user is authenticated, redirect to phone auth
        router.replace('/(auth)/PhoneAuthScreen');
        return;
      }

      setUser(user);
      try {
        // Get user document from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // If no user document exists, redirect to phone auth
          await signOut(auth);
          router.replace('/(auth)/PhoneAuthScreen');
          return;
        }

        // Set up real-time listener for existing user document
        const unsubscribeSnapshot = onSnapshot(userDocRef, 
          (doc) => {
            if (doc.exists()) {
              setUserData(doc.data());
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching user data:', error);
            showAlert('Error', 'Failed to load user data', 'error');
            setLoading(false);
          }
        );

        return () => unsubscribeSnapshot();
      } catch (error) {
        console.error('Error handling user data:', error);
        showAlert('Error', 'Failed to initialize user profile', 'error');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({
      visible: true,
      title,
      message,
      type
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.replace('/(auth)/PhoneAuthScreen');
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Error', 'Failed to sign out', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/(app)/EditProfileScreen');
  };

  const menuItems = [
    {
      title: 'My Orders',
      icon: 'shopping-bag' as const,
      onPress: () => router.push('/(app)/OrderScreen'),
    },
    {
      title: 'Payment Methods',
      icon: 'credit-card' as const,
      onPress: () => router.push('/(app)/PaymentScreen'),
    },
    {
      title: 'Addresses',
      icon: 'map-marker' as const,
      onPress: () => router.push('/(app)/AddressScreen'),
    },
    {
      title: 'Notifications',
      icon: 'bell' as const,
      onPress: () => router.push('/(app)/NotificationSettings'),
    },
    {
      title: 'Help & Support',
      icon: 'question-circle' as const,
      onPress: () => router.push('/(app)/SupportScreen'),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
      </View>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />

      <StyledAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
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
            <TouchableOpacity style={styles.editImageButton}>
              <FontAwesome name="camera" size={16} color={COLORS.primaryWhiteHex} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userData.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{userData.phoneNumber || 'No phone number'}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <FontAwesome name="edit" size={16} color={COLORS.primaryWhiteHex} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <FontAwesome name={item.icon} size={20} color={COLORS.primaryOrangeHex} />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={COLORS.primaryGreyHex} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primaryWhiteHex} />
          ) : (
            <>
              <FontAwesome name="sign-out" size={20} color={COLORS.primaryWhiteHex} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
  },
  header: {
    padding: SPACING.space_24,
    paddingTop: SPACING.space_36,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.space_16,
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
  },
  menuItemText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    margin: SPACING.space_24,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_20,
    gap: SPACING.space_12,
  },
  signOutText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default ProfileScreen; 