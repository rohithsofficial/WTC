import 'dotenv/config';

export default {
  expo: {
    name: "wtcApp",
    slug: "react-native-firebase", // ✅ Fixed: removed invalid character, use kebab-case
    owner: "rohithsofficial", // ✅ Added: required by EAS
    platforms: ["ios", "android", "web"],
    version: "1.0.0",
    orientation: "portrait",
    sdkVersion: "53.0.0",
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
       bundleIdentifier: "com.rohithofficial.wtccoffee",
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos to let you share them with your friends.",
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera to let you take photos for your profile."
      }
    },
    android: {
      "edgeToEdgeEnabled": true,
      // "adaptiveIcon": {
      //   "foregroundImage": "./assets/adaptive-icon.png",
      //   "backgroundColor": "#FFFFFF"
      // },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "android.permission.CAMERA",
        "android.permission.WRITE_SETTINGS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WAKE_LOCK"
      ],
      package: "com.rohithofficial.wtccoffee",
    },
   plugins: [
      "expo-notifications",
      "expo-router",
      // "expo-barcode-scanner", // This line should be gone!
      [
        "expo-image-picker",
        {
          photosPermission: "Allow $(PRODUCT_NAME) to access your photos to let you share them with your friends.",
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to let you take photos for your profile."
        }
      ],
      [
        "expo-brightness",
        {
          "permissions": ["WRITE_SETTINGS"]
        }
      ]
    ],
    scheme: "wtc",
    extra: {
      "eas": {
        "projectId": "7715d797-e572-4d29-90c3-30d357ec824f"
      },
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