import 'dotenv/config';

export default {
  expo: {
    name: "React Native Firebase",
    slug: "react-native-firebase",
    platforms: ["ios", "android", "web"],
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos to let you share them with your friends.",
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera to let you take photos for your profile."
      }
    },
    android: {
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow $(PRODUCT_NAME) to access your photos to let you share them with your friends.",
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to let you take photos for your profile."
        }
      ]
    ],
    scheme: "wtc",
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
      phonepeTestMerchantId: process.env.PHONEPE_TEST_MERCHANT_ID,
      phonepeTestSaltKey: process.env.PHONEPE_TEST_SALT_KEY,
      phonepeLiveMerchantId: process.env.PHONEPE_LIVE_MERCHANT_ID,
      phonepeLiveSaltKey: process.env.PHONEPE_LIVE_SALT_KEY,
      phonepeSaltIndex: process.env.PHONEPE_SALT_INDEX,
    }
  }
}; 