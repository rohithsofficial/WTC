import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from "../../src/theme/theme";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const HomeScreen1 = () => {
  const [isLoading, setIsLoading] = useState(true);
  const websiteUrl = "https://westernterraincoffee.com/";
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    // Hide bottom tab bar
    navigation.setOptions({
      tabBarStyle: { display: "none" },
      headerShown: true,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={COLORS.primaryBlackHex}
          />
        </TouchableOpacity>
      ),
      headerTitle: "Western Terrain Coffee",
      headerTitleStyle: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_18,
        color: COLORS.primaryBlackHex,
      },
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* WebView Container */}
      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: websiteUrl }}
          style={styles.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
            <Text style={styles.loadingText}>
              Loading Western Terrain Coffee...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  webviewContainer: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryWhiteHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_12,
  },
  backButton: {
    marginLeft: SPACING.space_16,
  },
});

export default HomeScreen1;
