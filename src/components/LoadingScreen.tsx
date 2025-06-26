//LoadingScreen.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from "../theme/theme";

const { width } = Dimensions.get("window");

const LoadingScreen = () => {
  const scaleAnim = new Animated.Value(0.8);
  const dropAnim = new Animated.Value(-100);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Drop up animation for logo
    Animated.sequence([
      Animated.timing(dropAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 5,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in animation for text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 3000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }, { translateY: dropAnim }],
          },
        ]}
      >
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Animated.Text style={[styles.title]}>
            Western Terrain Coffee
          </Animated.Text>
          <Animated.Text style={[styles.subtitle]}>
            Experience the perfect brew
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    width: width,
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: SPACING.space_20,
    alignSelf: "center",
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_30,
    color: "#FFFFFF",
    marginBottom: SPACING.space_8,
    textAlign: "center",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    fontWeight: "900",
  },
  subtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,

    fontWeight: "900",
  },
});

export default LoadingScreen;