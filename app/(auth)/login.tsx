import React, { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../src/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const onFooterLinkPress = () => {
    router.push('/register');
  };

  const onLoginPress = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      const userDoc = await getDoc(doc(db, 'users', uid));

      if (!userDoc.exists()) {
        alert('User does not exist anymore.');
        setIsLoading(false);
        return;
      }

      const userData = userDoc.data() as DocumentData;
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      router.replace('/(app)/HomeScreen');
    } catch (error: any) {
      alert(error.message || 'Login failed');
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
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
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
              textContentType="password"
              autoComplete="password"
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

          <TouchableOpacity
            style={[styles.button, (!email || !password) && styles.buttonDisabled]}
            onPress={onLoginPress}
            disabled={!email || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonTitle}>Log In</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerView}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text onPress={onFooterLinkPress} style={styles.footerLink}>
                Sign up
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