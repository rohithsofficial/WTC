import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { auth, db } from '../../src/firebase/firebase-config';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import StyledAlert from '../../src/components/StyledAlert';

const EditProfileScreen = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        router.replace('/(auth)/phone-auth');
        return;
      }

      try {
        const userDocRef = db.collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setDisplayName(data?.displayName || '');
          setEmail(data?.email || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showAlert('Error', 'Failed to load user data', 'error');
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
    });

    return unsubscribe;
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert('Error', 'Failed to pick image', 'error');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    try {
      setUploading(true);
      
      // Create a reference to Firebase Storage
      const storageRef = storage().ref(`profile_images/${user.uid}`);
      
      // Upload the image
      await storageRef.putFile(uri);
      
      // Get the download URL
      const downloadURL = await storageRef.getDownloadURL();
      
      // Update Firebase Auth profile
      await user.updateProfile({ 
        photoURL: downloadURL 
      });
      
      // Update Firestore user document
      await db.collection('users').doc(user.uid).update({
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });

      // Update local user state
      setUser(auth.currentUser);

      showAlert('Success', 'Profile photo updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('Error', 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      showAlert('Missing Information', 'Please enter your name', 'error');
      return;
    }

    try {
      setLoading(true);

      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: displayName.trim()
      });

      // Update Firestore user document
      await db.collection('users').doc(user.uid).update({
        displayName: displayName.trim(),
        email: email.trim(),
        updatedAt: new Date().toISOString()
      });

      // Update local user state
      setUser(auth.currentUser);

      showAlert('Success', 'Profile updated successfully', 'success');
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error', 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
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
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                user.photoURL
                  ? { uri: user.photoURL }
                  : require('../../assets/icon.png')
              }
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.editImageButton}
              onPress={pickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primaryWhiteHex} />
              ) : (
                <FontAwesome name="camera" size={16} color={COLORS.primaryWhiteHex} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.primaryGreyHex}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.primaryGreyHex}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userData?.phoneNumber || ''}
              editable={false}
              placeholderTextColor={COLORS.primaryGreyHex}
            />
            <Text style={styles.disabledText}>Phone number cannot be changed</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primaryWhiteHex} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.space_24,
    paddingTop: SPACING.space_36,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  headerRight: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  profileImageSection: {
    alignItems: 'center',
    padding: SPACING.space_24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.space_8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryGreyHex,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primaryOrangeHex,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryWhiteHex,
  },
  changePhotoText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  formSection: {
    padding: SPACING.space_24,
  },
  inputContainer: {
    marginBottom: SPACING.space_24,
  },
  inputLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  input: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_12,
  },
  disabledInput: {
    backgroundColor: COLORS.primaryGreyHex + '10',
    color: COLORS.primaryGreyHex,
  },
  disabledText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_4,
  },
  notificationSection: {
    padding: SPACING.space_24,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryGreyHex + '20',
  },
  notificationItemLeft: {
    flex: 1,
    marginRight: SPACING.space_16,
  },
  notificationLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  notificationDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
  },
  saveButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    margin: SPACING.space_24,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default EditProfileScreen;