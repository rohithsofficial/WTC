import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { auth, db } from '../../src/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import StyledAlert from '../../src/components/StyledAlert';

const UserDetailsScreen = () => {
  const { phoneNumber, userId } = useLocalSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

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

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      showAlert('Missing Information', 'Please enter your full name', 'error');
      return;
    }

    try {
      setLoading(true);

      // Check if user document already exists
      const userDocRef = doc(db, 'users', userId as string);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing user document
        await setDoc(userDocRef, {
          displayName: fullName,
          email: email.trim(),
          phoneNumber,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        // Create new user document
        await setDoc(userDocRef, {
          displayName: fullName,
          email: email.trim(),
          phoneNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      showAlert('Success', 'Profile created successfully!', 'success');
      router.replace('/(app)/HomeScreen');
    } catch (error) {
      console.error('Error saving user details:', error);
      showAlert('Error', 'Failed to save user details. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Complete Profile',
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Please provide your details to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome
                name="user"
                size={20}
                color={COLORS.primaryGreyHex}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.primaryGreyHex}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome
                name="envelope"
                size={20}
                color={COLORS.primaryGreyHex}
                style={styles.inputIcon}
              />
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
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primaryWhiteHex} />
            ) : (
              <Text style={styles.submitButtonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.space_24,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.space_36,
    marginBottom: SPACING.space_36,
  },
  title: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  subtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  form: {
    marginBottom: SPACING.space_24,
  },
  inputContainer: {
    marginBottom: SPACING.space_16,
  },
  inputLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
    borderRadius: BORDERRADIUS.radius_10,
    paddingHorizontal: SPACING.space_12,
  },
  inputIcon: {
    marginRight: SPACING.space_12,
  },
  input: {
    flex: 1,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    paddingVertical: SPACING.space_12,
  },
  submitButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginTop: SPACING.space_24,
  },
  submitButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default UserDetailsScreen; 