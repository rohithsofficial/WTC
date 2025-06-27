import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from "../../src/theme/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { fetchActiveBanners } from "../../src/firebase/product-service";
import { fetchActiveOffers, Offer } from "../../src/firebase/offer-service";
import firestore from '@react-native-firebase/firestore';
import { db } from "../../src/firebase/firebase-config";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionUrl: string;
}

interface OfferData {
  title: string;
  description: string;
  gradientColors: [string, string];
  isActive: boolean;
}

const OffersScreen = () => {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Starting to fetch data...");

      const [activeBanners, activeOffers] = await Promise.all([
        fetchActiveBanners(),
        fetchActiveOffers(),
      ]);

      console.log("Fetched offers:", activeOffers);
      console.log("Number of offers:", activeOffers.length);

      setBanners(activeBanners);
      setOffers(activeOffers);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load offers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addOffer = async (offerData: OfferData) => {
    try {
      await db.collection('offers').add({
        ...offerData,
        isActive: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding offer:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={COLORS.primaryBlackHex}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Offers</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Banners Section */}
        <View style={styles.bannersContainer}>
          {banners.length > 0 ? (
            banners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                style={styles.bannerCard}
                onPress={() => {
                  // Handle banner action
                }}
              >
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  colors={[COLORS.primaryWhiteHex, "#F8E9DB"]}
                  style={styles.bannerGradient}
                >
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                    <TouchableOpacity
                      style={styles.bannerButton}
                      onPress={() => {
                        // Handle learn more action
                      }}
                    >
                      <Text style={styles.bannerButtonText}>Learn More</Text>
                    </TouchableOpacity>
                  </View>
                  {banner.imageUrl ? (
                    <Image
                      source={{ uri: banner.imageUrl }}
                      style={styles.bannerImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={require("../../assets/icon.png")}
                      style={styles.bannerImage}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.bannerCard}>
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={[COLORS.primaryWhiteHex, "#F8E9DB"]}
                style={styles.bannerGradient}
              >
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>Special Offer</Text>
                  <Text style={styles.bannerSubtitle}>
                    Get 20% off on your first order
                  </Text>
                  <TouchableOpacity
                    style={styles.bannerButton}
                    onPress={() => router.push("/menu")}
                  >
                    <Text style={styles.bannerButtonText}>Order Now</Text>
                  </TouchableOpacity>
                </View>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.bannerImage}
                />
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Additional Offers Section */}
        <View style={styles.additionalOffersContainer}>
          <Text style={styles.sectionTitle}>More Offers</Text>
          {offers.length === 0 ? (
            <Text style={styles.noOffersText}>
              No offers available at the moment
            </Text>
          ) : (
            <View style={styles.offersGrid}>
              {offers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <LinearGradient
                    colors={offer.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.offerGradient}
                  >
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <Text style={styles.offerDescription}>
                      {offer.description}
                    </Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryWhiteHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.space_20,
    paddingTop: SPACING.space_20,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_16,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SPACING.space_28,
  },
  bannersContainer: {
    paddingHorizontal: SPACING.space_24,
    paddingTop: SPACING.space_20,
  },
  bannerCard: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  bannerGradient: {
    flex: 1,
    flexDirection: "row",
    padding: SPACING.space_20,
  },
  bannerContent: {
    flex: 1,
    justifyContent: "center",
  },
  bannerTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  bannerSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    marginBottom: SPACING.space_20,
  },
  bannerButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  bannerButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  bannerImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  additionalOffersContainer: {
    marginTop: SPACING.space_24,
    paddingHorizontal: SPACING.space_24,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_15,
  },
  offersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  offerCard: {
    width: "48%",
    height: 150,
    marginBottom: SPACING.space_16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  offerGradient: {
    flex: 1,
    padding: SPACING.space_16,
    justifyContent: "center",
  },
  offerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  offerDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryDarkGreyHex,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.space_20,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryRedHex,
    textAlign: "center",
    marginBottom: SPACING.space_20,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  noOffersText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    textAlign: "center",
    marginTop: SPACING.space_20,
  },
});

export default OffersScreen;
