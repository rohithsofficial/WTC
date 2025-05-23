// File: app/_layout.tsx
import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../src/firebase/config';
import { useRouter, useSegments } from 'expo-router';
import { CartProvider } from '../src/store/CartContext';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!user && !inAuthGroup) {
        // Redirect to the sign-in page if not signed in
        router.replace('/(auth)/PhoneAuthScreen');
      } else if (user && inAuthGroup) {
        // Redirect to the home page if signed in
        router.replace('/(app)/HomeScreen');
      }
    });

    return unsubscribe;
  }, [segments]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="product-detail/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="product/[category]" options={{ headerShown: false }} />
          </Stack>
        </CartProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
