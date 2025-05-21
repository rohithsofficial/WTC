// File: app/_layout.tsx
import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { decode, encode } from 'base-64';
import { View, ActivityIndicator } from 'react-native';
import { CartProvider } from '../src/store/CartContext';

// Add base-64 polyfills
if (!global.btoa) { global.btoa = encode; }
if (!global.atob) { global.atob = decode; }

export default function RootLayout() {
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen 
              name="(auth)" 
              options={{ 
                headerShown: false,
                gestureEnabled: false 
              }} 
            />
            <Stack.Screen 
              name="(app)" 
              options={{ 
                headerShown: false,
                gestureEnabled: false 
              }}
            />
            <Stack.Screen 
              name="product-detail"
              options={{ 
                headerShown: false,
                gestureEnabled: false,
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="product"
              options={{ 
                headerShown: false,
                gestureEnabled: false,
                presentation: 'modal'
              }}
            />
          </Stack>
        </CartProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
