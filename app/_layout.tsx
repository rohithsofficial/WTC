import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from '@/src/store/CartContext';
import { StyleSheet } from 'react-native';

// In your React Native app (e.g., App.tsx or a dedicated push notification setup file)

import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../src/firebase/config'; // Your Firebase config for the mobile app
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth'; // For listening to user login state

// Call this function to set up notification handling for your app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert even if app is foregrounded
    shouldPlaySound: false,
    shouldSetBadge: false,
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
    await setDoc(doc(db, "users", userId), {
      expoPushToken: token,
    }, { merge: true }); // Use merge:true to update without overwriting other fields
    console.log("Expo Push Token successfully saved for user:", userId);
  } catch (error) {
    console.error("Error saving Expo Push Token:", error);
  }
}

// This useEffect hook makes sure the token is registered and saved
// whenever the user's authentication state changes (e.g., they log in).
export function NotificationSetup() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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

    // Clean up listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationReceivedListener);
      Notifications.removeNotificationSubscription(notificationResponseListener);
    };
  }, []);
  return null; // This component doesn't render anything, it's for side effects
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
         <NotificationSetup />
        <CartProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
              <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="category/[category]" options={{ headerShown: false }} />
            </Stack>
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