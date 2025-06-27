import React, { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { auth, db } from '../../src/firebase/firebase-config';
import authModule from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Register() {
  const [displayName, setdisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const onFooterLinkPress = () => {
    router.push('/login');
  };

  const onRegisterPress = async () => {
    if (password !== confirmPassword) {
      alert("Passwords don't match.");
      return;
    }

    if (!displayName || !email || !password) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await authModule().createUserWithEmailAndPassword(email.trim(), password);
      await userCredential.user.updateProfile({ displayName });
      const uid = userCredential.user.uid;
      const data = {
        id: uid,
        email: email.trim(),
        displayName,
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').doc(uid).set(data);
      router.replace('/(app)/HomeScreen');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('../../assets/icon.png')}
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#aaaaaa"
              onChangeText={setdisplayName}
              value={displayName}
              underlineColorAndroid="transparent"
              autoCapitalize="words"
              textContentType="name"
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaaaaa"
              onChangeText={setEmail}
              value={email}
              underlineColorAndroid="transparent"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaaaaa"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
              underlineColorAndroid="transparent"
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <TouchableOpacity 
              style={styles.passwordIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#aaaaaa"
              secureTextEntry={!showConfirmPassword}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              underlineColorAndroid="transparent"
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <TouchableOpacity 
              style={styles.passwordIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, (!email || !password || !displayName || !confirmPassword) && styles.buttonDisabled]}
            onPress={onRegisterPress}
            disabled={!email || !password || !displayName || !confirmPassword || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonTitle}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerView}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text onPress={onFooterLinkPress} style={styles.footerLink}>
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    padding: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
  },
  inputIcon: {
    marginRight: 10,
  },
  passwordIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#788eec',
    marginTop: 20,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  footerView: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  footerLink: {
    color: '#788eec',
    fontWeight: 'bold',
  },
}); 