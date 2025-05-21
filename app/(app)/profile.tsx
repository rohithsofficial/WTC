import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

const ProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profileImage: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        setUserData({
          fullName: currentUser.displayName || '',
          email: currentUser.email || '',
          phone: userData?.phone || '',
          address: userData?.address || '',
          profileImage: currentUser.photoURL || '',
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      ToastAndroid.show('Error loading profile', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: userData.fullName,
        });

        await updateDoc(doc(db, 'users', currentUser.uid), {
          fullName: userData.fullName,
          phone: userData.phone,
          address: userData.address,
          updatedAt: new Date().toISOString(),
        });

        ToastAndroid.show('Profile updated successfully', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      ToastAndroid.show('Error updating profile', ToastAndroid.SHORT);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
      router.replace('/login'); // Adjust to your actual login route
    } catch (error) {
      console.error('Logout failed:', error);
      ToastAndroid.show('Logout failed', ToastAndroid.SHORT);
    }
  };

  const handleLoginRedirect = () => {
    router.replace('/login'); // Adjust to your actual login route
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: {
            backgroundColor: COLORS.deepCoffeeBrownHex,
          },
          headerTintColor: COLORS.creamyBeigeHex,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {userData.profileImage ? (
              <Image
                source={{ uri: userData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <FontAwesome name="user" size={40} color={COLORS.creamyBeigeHex} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{userData.fullName || 'User'}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={userData.fullName}
              onChangeText={(text) => setUserData({ ...userData, fullName: text })}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.primaryDarkGreyHex}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userData.email}
              editable={false}
              placeholderTextColor={COLORS.primaryDarkGreyHex}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={userData.phone}
              onChangeText={(text) => setUserData({ ...userData, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.primaryDarkGreyHex}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={userData.address}
              onChangeText={(text) => setUserData({ ...userData, address: text })}
              placeholder="Enter your address"
              placeholderTextColor={COLORS.primaryDarkGreyHex}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateProfile}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.creamyBeigeHex} />
            ) : (
              <Text style={styles.updateButtonText}>Update Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authButton}
            onPress={user ? handleLogout : handleLoginRedirect}>
            <Text style={styles.authButtonText}>
              {user ? 'Logout' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepCoffeeBrownHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.deepCoffeeBrownHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.creamyBeigeHex,
    marginTop: SPACING.space_20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.space_30,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: SPACING.space_20,
    backgroundColor: COLORS.primaryOrangeHex,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
  },
  profileName: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.creamyBeigeHex,
  },
  formContainer: {
    padding: SPACING.space_20,
  },
  inputGroup: {
    marginBottom: SPACING.space_20,
  },
  label: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.creamyBeigeHex,
    marginBottom: SPACING.space_8,
  },
  input: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_15,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  disabledInput: {
    backgroundColor: COLORS.primaryLightGreyHex,
    color: COLORS.primaryDarkGreyHex,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_15,
    alignItems: 'center',
    marginTop: SPACING.space_20,
  },
  updateButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.creamyBeigeHex,
  },
  authButton: {
    marginTop: SPACING.space_20,
    alignItems: 'center',
  },
  authButtonText: {
    color: COLORS.creamyBeigeHex,
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;
