// app/_layout.tsx
// Suppress deprecation warnings during migration
declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import 'react-native-gesture-handler'; // Keep this at the top for Gesture Handler
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from '@/src/store/CartContext'; // Assuming @/src maps to src/
import { StyleSheet } from 'react-native';

// In your React Native app (e.g., App.tsx or a dedicated push notification setup file)
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { auth, db, onAuthStateChanged } from '../src/firebase/firebase-config'; // Corrected path to src/firebase
import { doc, setDoc } from '@react-native-firebase/firestore';

// Call this function to set up notification handling for your app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true, // ✅ NEW
    shouldShowList: true,   // ✅ NEW
  }),
});

async function registerAndSavePushToken(userId: string) {
  // 1. Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return; // User denied permissions
  }

  // 2. Get the Expo Push Token for this device
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Obtained Expo Push Token:', token);

  // 3. Save the token to the user's document in Firestore
  // (This is how the Cloud Function will know where to send notifications)
  try {
    await setDoc(doc(db, 'users', userId), {
      expoPushToken: token,
    }, { merge: true });
    console.log("Expo Push Token successfully saved for user:", userId);
  } catch (error) {
    console.error("Error saving Expo Push Token:", error);
  }
}

function StackScreens() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Move notification setup logic here
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      if (user) {
        registerAndSavePushToken(user.uid);
      }
    });

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Listen for notifications received while the app is in the foreground
  useEffect(() => {
    const notificationReceivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // Here you can show an in-app banner, update UI, etc.
      // The system notification will also appear because of setNotificationHandler
    });

    // Listen for user interaction with notifications (when they tap on it)
    const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const { notification } = response;
      const data = notification.request.content.data; // This is your custom 'data' payload

      // You can use the 'data' to navigate to a specific screen
      if (data && data.screen) {
        // Example using expo-router:
        // import { router } from 'expo-router';
        // router.push({ pathname: data.screen, params: data.params });
        console.log(`Navigating to ${data.screen} with params:`, data.params);
      }

      // Mark notification as read in Firestore
      if (data && data.notificationId) {
        // import { markNotificationAsRead } from './src/firebase/notification-service'; // Your mobile app's service
        // markNotificationAsRead(data.notificationId);
        console.log(`Notification ${data.notificationId} marked as read.`);
      }
    });

    // Clean up listeners using the new .remove() method
    return () => {
      notificationReceivedListener.remove();
      notificationResponseListener.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <CartProvider>
          <StackScreens />
        </CartProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});