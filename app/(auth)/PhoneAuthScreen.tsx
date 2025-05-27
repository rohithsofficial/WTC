import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { auth } from '../../src/firebase/config';
import { PhoneAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import Constants from 'expo-constants';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import StyledAlert from '../../src/components/StyledAlert';

export const PhoneAuthScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  
  // Alert state
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

  // Set language code for SMS messages
  auth.languageCode = 'en';

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      showAlert('Missing Information', 'Please enter your phone number to continue', 'error');
      return;
    }

    if (!recaptchaVerifier.current) {
      showAlert('System Error', 'Unable to verify your device. Please try again.', 'error');
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Create a new PhoneAuthProvider instance
      const phoneProvider = new PhoneAuthProvider(auth);
      
      // Send verification code
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );
      
      setVerificationId(verificationId);
      setShowOTPInput(true);
      showAlert('Verification Code Sent', 'Please check your messages for the 6-digit code', 'success');
    } catch (error: any) {
      console.error('OTP send error:', error);
      let errorTitle = 'Verification Failed';
      let errorMessage = 'Unable to send verification code. Please try again.';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'The phone number you entered is not valid. Please check and try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        case 'auth/billing-not-enabled':
          errorMessage = 'Phone verification is currently unavailable. Please contact support.';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'Security verification failed. Please try again.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorTitle = 'Error';
          errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      showAlert(errorTitle, errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!verificationCode.trim()) {
      showAlert('Missing Information', 'Please enter the verification code', 'error');
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Create a credential with the verification ID and code
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      
      // Sign in with the credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user document exists with this phone number
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', formattedPhone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Existing user - update their auth profile with existing data
        const existingUserDoc = querySnapshot.docs[0];
        const existingUserData = existingUserDoc.data();
        
        await updateProfile(user, {
          displayName: existingUserData.displayName || user.displayName
        });

        showAlert('Success', 'Welcome back!', 'success');
        router.replace('/(app)/HomeScreen');
      } else {
        // New user - navigate to user details screen without creating document
        router.push({
          pathname: '/(auth)/UserDetailsScreen',
          params: {
            phoneNumber: formattedPhone,
            verificationId: verificationId,
            userId: user.uid
          }
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      let errorTitle = 'Verification Failed';
      let errorMessage = 'Unable to verify the code. Please try again.';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'The verification code you entered is incorrect. Please check and try again.';
          break;
        case 'auth/code-expired':
          errorMessage = 'The verification code has expired. Please request a new one.';
          break;
        case 'auth/credential-already-in-use':
          errorMessage = 'This phone number is already registered with another account.';
          break;
        case 'auth/invalid-verification-id':
          errorMessage = 'Invalid verification session. Please request a new code.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Phone authentication is not enabled. Please contact support.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid verification code. Please check and try again.';
          break;
        case 'auth/missing-verification-code':
          errorMessage = 'Please enter the verification code.';
          break;
        case 'auth/missing-verification-id':
          errorMessage = 'Verification session expired. Please request a new code.';
          break;
        default:
          errorTitle = 'Error';
          errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      showAlert(errorTitle, errorMessage, 'error');
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
          title: 'Phone Login',
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

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={Constants.expoConfig?.web?.config?.firebase}
        attemptInvisibleVerification={true}
        title="Verify your phone number"
        cancelLabel="Cancel"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Phone Login</Text>
          <Text style={styles.subtitle}>Enter your phone number to continue</Text>
        </View>

        <View style={styles.form}>
          {!showOTPInput ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome
                    name="phone"
                    size={20}
                    color={COLORS.primaryGreyHex}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter your phone number"
                    placeholderTextColor={COLORS.primaryGreyHex}
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                </View>
                <Text style={styles.helperText}>Format: +91XXXXXXXXXX</Text>
              </View>

              <TouchableOpacity
                style={styles.sendOTPButton}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.primaryWhiteHex} />
                ) : (
                  <Text style={styles.sendOTPButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome
                    name="key"
                    size={20}
                    color={COLORS.primaryGreyHex}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor={COLORS.primaryGreyHex}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.primaryWhiteHex} />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendOTP}
                disabled={loading}
              >
                <Text style={styles.resendButtonText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Or login with email? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/LoginScreen')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
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
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.space_16,
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
    textAlign: 'center',
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
  helperText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_4,
  },
  sendOTPButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginBottom: SPACING.space_24,
  },
  sendOTPButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  verifyButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginBottom: SPACING.space_16,
    opacity: 1,
  },
  verifyButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: SPACING.space_24,
  },
  resendButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  loginLink: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
  },
});

export default PhoneAuthScreen;