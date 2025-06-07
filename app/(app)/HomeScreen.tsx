import React, { useRef, useState, useEffect } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ToastAndroid,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  ImageBackground,
  Animated,
} from "react-native";
import { useStore } from "../../src/store/store";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from "../../src/theme/theme";
import { useRouter } from "expo-router";
import HeaderBar from "../../src/components/HeaderBar";
import CustomIcon from "../../src/components/CustomIcon";
import { FlatList } from "react-native";
import CoffeeCard from "../../src/components/CoffeeCard";
import {
  Product,
  CartItem,
  Category,
  Banner,
  Offer,
} from "../../src/types/interfaces";
import {
  searchProducts,
  fetchActiveBanners,
  fetchCategories,
} from "../../src/firebase/product-service";
import { Picker } from "@react-native-picker/picker";
import {
  FontAwesome,
  MaterialIcons,
  Ionicons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetchActiveOffers } from "../../src/firebase/offer-service";
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from "../../src/firebase/notification-service";
import { useAuth } from "../../src/context/AuthContext";

// Add type definition for footer special offer
interface FooterOffer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  actionUrl: string;
  backgroundColor: string;
}

const quickActions = [
  { label: "Menu", icon: "restaurant-menu" as const, sub: "Explore" },
  { label: "Coffee", icon: "grain" as const, sub: "Beans" },
  { label: "Loyalty", icon: "stars" as const, sub: "Points" },
  { label: "Offers", icon: "local-offer" as const, sub: "2 New", badge: true },
  { label: "Cafes", icon: "storefront" as const, sub: "Explore" },
];

const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Access store state and actions
  const {
    productsByCategory,
    allProducts,
    isLoading,
    error,
    fetchData,
    addToCart,
    calculateCartPrice,
  } = useStore();

  // Local state
  const [selectedStore, setSelectedStore] = useState<string>("main");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [currentTopBannerIndex, setCurrentTopBannerIndex] = useState(0);
  const [footerOffers, setFooterOffers] = useState<FooterOffer[]>([]);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [offers, setOffers] = useState<Offer[]>([]);
  const [visitedOffers, setVisitedOffers] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Store options with icons
  const storeOptions = [
    {
      id: "main",
      name: "Western Terrain Coffee Roasters | Kundanahalli",
      icon: "store" as const,
      address:
        "Madikeri, SH 88 Piriyapatna - Kushalnagar, Road, Kundanahalli, Karnataka 571107",
    },
    {
      id: "uptown",
      name: "Uptown",
      icon: "business" as const,
      address: "789 Uptown Blvd",
    },
  ];

  // Refs
  const ListRef = useRef<FlatList<Product>>(null);

  // Get bottom tab bar height for proper layout
  const tabBarHeight = useBottomTabBarHeight();

  // Fetch data on component mount
  useEffect(() => {
    console.log("Fetching data...");
    fetchData();
    loadBanners();
    loadCategories();
    loadFooterOffers();
    loadOffers();
  }, []);

  useEffect(() => {
    // console.log("All products loaded:", allProducts);
  }, [allProducts]);

  // Rotate through top banners
  useEffect(() => {
    if (banners.length > 0) {
      const interval = setInterval(() => {
        setCurrentTopBannerIndex((prevIndex) =>
          prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // Change banner every 5 seconds

      return () => clearInterval(interval);
    }
  }, [banners]);

  // Banner animation effect
  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }).start(() => {
          // Change image after fade out
          setBannerIndex((prev) => (prev + 1) % banners.length);
          // Fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }).start();
        });
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [fadeAnim, banners]);

  useEffect(() => {
    // Set up real-time notification listener
    const unsubscribe = subscribeToNotifications(user?.uid, (count) => {
      setUnreadCount(count);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user?.uid]);

  // Load banners
  const loadBanners = async () => {
    try {
      console.log("Starting to load banners...");
      setIsLoadingBanners(true);
      const activeBanners = await fetchActiveBanners();
      console.log("Banners loaded:", activeBanners);
      setBanners(activeBanners);
    } catch (error) {
      console.error("Error loading banners:", error);
      ToastAndroid.show("Failed to load banners", ToastAndroid.SHORT);
    } finally {
      setIsLoadingBanners(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const categoryList = await fetchCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error("Error loading categories:", error);
      ToastAndroid.show("Failed to load categories", ToastAndroid.SHORT);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Load footer offers (this would be fetched from your backend in a real app)
  const loadFooterOffers = async () => {
    // This is a placeholder. In a real app, you would fetch this from your backend
    const mockFooterOffers: FooterOffer[] = [
      {
        id: "1",
        title: "Free Coffee Day",
        description: "Visit us on May 25th for a free coffee!",
        imageUrl: "https://example.com/free-coffee.jpg",
        actionUrl: "https://example.com/free-coffee-promo",
        backgroundColor: "#8A5A44",
      },
      {
        id: "2",
        title: "Happy Hour",
        description: "20% off all drinks from 2-4 PM daily",
        imageUrl: "https://example.com/happy-hour.jpg",
        actionUrl: "https://example.com/happy-hour-promo",
        backgroundColor: "#6F4E37",
      },
      {
        id: "3",
        title: "Loyalty Program",
        description: "Join now & get every 10th drink free",
        imageUrl: "https://example.com/loyalty.jpg",
        actionUrl: "https://example.com/loyalty-program",
        backgroundColor: "#5C4033",
      },
    ];

    setFooterOffers(mockFooterOffers);
  };

  // Load offers from Firebase
  const loadOffers = async () => {
    try {
      const activeOffers = await fetchActiveOffers();
      setOffers(activeOffers);
    } catch (error) {
      console.error("Error loading offers:", error);
      ToastAndroid.show("Failed to load offers", ToastAndroid.SHORT);
    }
  };

  // Handle search
  const handleSearch = async (search: string) => {
    setSearchText(search);
    if (search.length > 0) {
      setIsSearching(true);
      try {
        const results = await searchProducts(search);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        ToastAndroid.show("Error searching products", ToastAndroid.SHORT);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Handle search result press
  const handleSearchResultPress = (product: Product) => {
    router.push({
      pathname: "/products/[id]",
      params: { id: product.id },
    });
    setSearchText("");
    setSearchResults([]);
  };

  // Handle banner action
  const handleBannerAction = async (actionUrl: string) => {
    try {
      // Ensure URL has proper format
      const formattedUrl = actionUrl.startsWith("http")
        ? actionUrl
        : `https://${actionUrl}`;
      const canOpen = await Linking.canOpenURL(formattedUrl);

      if (canOpen) {
        await Linking.openURL(formattedUrl);
      } else {
        ToastAndroid.show("Cannot open this link", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      ToastAndroid.show("Could not open the link", ToastAndroid.SHORT);
    }
  };

  // Handle category selection
  const handleCategoryPress = (category: Category) => {
    console.log("Navigating to category:", {
      id: category.id,
      name: category.name,
      path: "/(app)/category/[category]",
    });
    try {
      router.push({
        pathname: "/(app)/category/[category]",
        params: { category: category.id },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      ToastAndroid.show("Error navigating to category", ToastAndroid.SHORT);
    }
  };

  // Handle adding to cart
  const handleAddToCart = (item: Product) => {
    const cartItem: CartItem = {
      ...item,
      prices: [
        {
          size: "Regular",
          price: item.prices[0].toString(),
          currency: "₹",
          quantity: 1,
        },
      ],
    };

    addToCart(cartItem);
    calculateCartPrice();
  };

  // Handle footer offer press
  const handleFooterOfferPress = (offer: FooterOffer) => {
    try {
      // Ensure URL has proper format
      const formattedUrl = offer.actionUrl.startsWith("http")
        ? offer.actionUrl
        : `https://${offer.actionUrl}`;
      Linking.canOpenURL(formattedUrl).then((canOpen) => {
        if (canOpen) {
          Linking.openURL(formattedUrl);
        } else {
          ToastAndroid.show("Cannot open this link", ToastAndroid.SHORT);
        }
      });
    } catch (error) {
      console.error("Error opening URL:", error);
      ToastAndroid.show("Could not open the link", ToastAndroid.SHORT);
    }
  };

  // Handle offer press
  const handleOfferPress = (offerId: string) => {
    setVisitedOffers((prev) => [...prev, offerId]);
    router.push("/OffersScreen");
  };

  // Filter active and unvisited offers
  const activeUnvisitedOffers = offers.filter(
    (offer) => offer.isActive && !visitedOffers.includes(offer.id)
  );

  // Loading view
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  // Error view
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get current banner for top banner section
  const currentBanner =
    banners.length > 0 ? banners[currentTopBannerIndex] : null;

  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowStorePicker(true)}
        >
          <View style={styles.locationInfo}>
            <MaterialIcons
              name="location-on"
              size={16}
              color={COLORS.primaryOrangeHex}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {storeOptions.find((store) => store.id === selectedStore)?.name ||
                "Select location"}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={16}
              color={COLORS.primaryBlackHex}
            />
          </View>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSearchBar(true)}
          >
            <MaterialIcons
              name="search"
              size={24}
              color={COLORS.primaryBlackHex}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/NotificationScreen")}
          >
            <View style={styles.notificationIconContainer}>
              <MaterialIcons
                name="notifications"
                size={24}
                color={COLORS.primaryBlackHex}
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/ProfileScreen")}
          >
            <MaterialIcons
              name="person"
              size={24}
              color={COLORS.primaryBlackHex}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Overlay */}
      {showSearchBar && (
        <View style={styles.searchBarOverlay}>
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBarWrapper}>
              <MaterialIcons
                name="search"
                size={24}
                color={COLORS.primaryDarkGreyHex}
              />
              <TextInput
                style={styles.searchInputField}
                placeholder="Search for coffee..."
                value={searchText}
                onChangeText={handleSearch}
                placeholderTextColor={COLORS.primaryDarkGreyHex}
                autoFocus={true}
              />
            </View>
            <TouchableOpacity
              style={styles.closeSearchButton}
              onPress={() => {
                setShowSearchBar(false);
                setSearchText("");
                setSearchResults([]);
              }}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={COLORS.primaryBlackHex}
              />
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              {searchResults.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultPress(product)}
                >
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{product.name}</Text>
                    <Text style={styles.searchResultPrice}>
                      ₹{product.prices[0].price}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Banner and Quick Actions */}
      <View style={styles.bannerWrap}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <ImageBackground
            source={{ uri: banners[bannerIndex]?.imageUrl }}
            style={styles.banner}
            resizeMode="cover"
          />
        </Animated.View>
        <View style={styles.bannerOverlay} />
        <View style={styles.bannerContent}>
          <Text style={styles.bannerSectionTitle}>Featured Collection</Text>
          <Text style={styles.bannerTitle}>Welcome Back!</Text>
          <Text style={styles.bannerSubtitle}>
            Discover our latest coffee and treats
          </Text>
        </View>

        <View style={styles.quickActionsRowOverlap}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => {
                if (action.label === "Menu") {
                  router.push("/MenuScreen");
                } else if (action.label === "Coffee") {
                  router.push("/HomeScreen1");
                } else if (action.label === "Loyalty") {
                  router.push("/LoyaltyScreen");
                } else if (action.label === "Offers") {
                  router.push("/OffersScreen");
                } else if (action.label === "Cafes") {
                  router.push("/explore");
                }
              }}
            >
              <View style={styles.quickActionIconWrap}>
                <MaterialIcons
                  name={action.icon}
                  size={28}
                  color={COLORS.primaryBlackHex}
                />
                {action.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}></Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Text style={styles.quickActionSub}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingTop: 100 }, // Add padding to start after quick actions
        ]}
      >
        {/* Dynamic Hero Section */}
        {currentBanner ? (
          <TouchableOpacity
            style={styles.heroContainer}
            onPress={() => handleBannerAction(currentBanner.actionUrl)}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={[COLORS.primaryWhiteHex, "#F8E9DB"]}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{currentBanner.title}</Text>
                <Text style={styles.heroSubtitle}>
                  {currentBanner.subtitle}
                </Text>
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={() => handleBannerAction(currentBanner.actionUrl)}
                >
                  <Text style={styles.heroButtonText}>Learn More</Text>
                </TouchableOpacity>
              </View>
              {currentBanner.imageUrl ? (
                <Image
                  source={{ uri: currentBanner.imageUrl }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.heroImage}
                />
              )}
            </LinearGradient>

            {/* Banner Indicators */}
            <View style={styles.indicatorContainer}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentTopBannerIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.heroContainer}>
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={[COLORS.primaryWhiteHex, "#F8E9DB"]}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>Special Offer</Text>
                <Text style={styles.heroSubtitle}>
                  Get 20% off on your first order
                </Text>
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={() => router.push("/menu")}
                >
                  <Text style={styles.heroButtonText}>Order Now</Text>
                </TouchableOpacity>
              </View>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.heroImage}
              />
            </LinearGradient>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Get your Food to Dine-in Now</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryGradient}>
                  <MaterialIcons
                    name="local-cafe"
                    size={24}
                    color={COLORS.primaryOrangeHex}
                  />
                </View>
                <Text style={styles.categoryText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Additional Offers Section */}
        {activeUnvisitedOffers.length > 0 && (
          <View style={styles.additionalOffersContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={activeUnvisitedOffers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.offersScrollContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push("/OffersScreen")}
                  activeOpacity={0.7}
                >
                  <View style={styles.offerCard}>
                    <LinearGradient
                      colors={item.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.offerGradient}
                    >
                      <View style={styles.offerContent}>
                        <View style={styles.offerTextContainer}>
                          <Text style={styles.offerTitle}>{item.title}</Text>
                        </View>
                        <View style={styles.offerIconContainer}>
                          <MaterialIcons
                            name="card-giftcard"
                            size={24}
                            color={COLORS.primaryOrangeHex}
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Featured Products */}
        <View style={styles.featuredContainer}>
          <Text style={styles.featuredTitle}>Featured Products</Text>
          <Text style={styles.featuredSubtitle}>
            Discover our most popular items
          </Text>
          <FlatList
            ref={ListRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={allProducts.slice(0, 5)}
            contentContainerStyle={styles.FlatListContainer}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  console.log("Navigating to product:", {
                    id: item.id,
                    name: item.name,
                    path: "/(app)/products/[id]",
                  });
                  try {
                    router.push({
                      pathname: "/(app)/products/[id]",
                      params: { id: item.id },
                    });
                  } catch (error) {
                    console.error("Navigation error:", error);
                    ToastAndroid.show(
                      "Error navigating to product",
                      ToastAndroid.SHORT
                    );
                  }
                }}
                style={styles.CardLinearGradient}
              >
                <CoffeeCard
                  id={item.id}
                  index={parseInt(item.id)}
                  type={item.type}
                  roasted={item.roasted}
                  imagelink_square={item.imagelink_square}
                  name={item.name}
                  special_ingredient={item.special_ingredient}
                  average_rating={item.average_rating}
                  price={item.prices[0]}
                  buttonPressHandler={() => handleAddToCart(item)}
                />
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Coffee Categories */}
        <View style={styles.coffeeCategoriesContainer}>
          <Text style={styles.sectionTitle}>Coffee Beans Categories</Text>
          <View style={styles.coffeeCategoriesGrid}>
            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <View style={styles.coffeeCategoryIcon}>
                <MaterialIcons
                  name="grain"
                  size={32}
                  color={COLORS.primaryOrangeHex}
                />
              </View>
              <Text style={styles.coffeeCategoryText}>Coffee Beans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <View style={styles.coffeeCategoryIcon}>
                <MaterialIcons
                  name="filter-alt"
                  size={32}
                  color={COLORS.primaryOrangeHex}
                />
              </View>
              <Text style={styles.coffeeCategoryText}>Filter Coffee</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <View style={styles.coffeeCategoryIcon}>
                <MaterialIcons
                  name="coffee"
                  size={32}
                  color={COLORS.primaryOrangeHex}
                />
              </View>
              <Text style={styles.coffeeCategoryText}>Instant Coffee</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <View style={styles.coffeeCategoryIcon}>
                <MaterialIcons
                  name="local-cafe"
                  size={32}
                  color={COLORS.primaryOrangeHex}
                />
              </View>
              <Text style={styles.coffeeCategoryText}>Tea</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL("https://www.instagram.com/westernterrain/")
              }
            >
              <FontAwesome5 name="instagram" size={24} color="#E1306C" />
              <Text style={styles.socialText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL("https://www.facebook.com/westernterraincafe")
              }
            >
              <FontAwesome5 name="facebook" size={24} color="#1877F2" />
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_10,
    backgroundColor: "#F8E9DB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5D5C5",
  },
  locationButton: {
    flex: 0.4,
    paddingVertical: SPACING.space_16,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginHorizontal: SPACING.space_4,
    flex: 1,
  },
  topBarRight: {
    flex: 0.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: SPACING.space_8,
  },
  iconButton: {
    padding: SPACING.space_4,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SPACING.space_28,
  },
  heroContainer: {
    marginHorizontal: SPACING.space_24,
    marginTop: SPACING.space_20,
    height: 200,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: "hidden",
    backgroundColor: COLORS.primaryWhiteHex,
    top: -100,
    marginBottom: -90,
  },
  heroGradient: {
    flex: 1,
    flexDirection: "row",
    padding: SPACING.space_20,
  },
  heroContent: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  heroSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    marginBottom: SPACING.space_20,
  },
  heroButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    alignSelf: "flex-start",
  },
  heroButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  heroImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLightGreyHex,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: COLORS.primaryOrangeHex,
    width: 20,
  },
  searchBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.primaryWhiteHex,
    zIndex: 1000,
    paddingTop: SPACING.space_10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_10,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    marginRight: SPACING.space_8,
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
  },
  searchInputField: {
    flex: 1,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_8,
  },
  closeSearchButton: {
    padding: SPACING.space_8,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_10,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLightGreyHex,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.space_10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: BORDERRADIUS.radius_10,
  },
  searchResultInfo: {
    marginLeft: SPACING.space_10,
    flex: 1,
  },
  searchResultName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
  },
  searchResultPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_4,
  },
  categoriesContainer: {
    marginTop: SPACING.space_24,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_24,
    marginBottom: SPACING.space_15,
  },
  categoriesScrollContent: {
    paddingHorizontal: SPACING.space_24,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: SPACING.space_20,
  },
  categoryGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.space_8,
    backgroundColor: "#F8E9DB",
    borderWidth: 1,
    borderColor: "#E5D5C5",
  },
  categoryText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryBlackHex,
  },
  popularContainer: {
    marginTop: SPACING.space_24,
  },
  popularScrollContent: {
    paddingHorizontal: SPACING.space_24,
  },
  popularItem: {
    width: 160,
    marginRight: SPACING.space_20,
  },
  popularImage: {
    width: "100%",
    height: 160,
    borderRadius: BORDERRADIUS.radius_20,
    marginBottom: SPACING.space_8,
  },
  popularInfo: {
    padding: SPACING.space_8,
  },
  popularName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  popularPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  offersContainer: {
    marginTop: SPACING.space_24,
    paddingHorizontal: SPACING.space_24,
  },
  offersScrollContent: {
    paddingVertical: SPACING.space_16,
  },
  offerCard: {
    width: 280,
    height: 70,
    marginRight: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
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
  offerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerTextContainer: {
    flex: 1,
  },
  offerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryWhiteHex,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.space_12,
  },
  offerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  offerDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryBlackHex,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryWhiteHex,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_10,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  bannerWrap: {
    position: "relative",
    marginBottom: 64,
    zIndex: 1,
  },
  banner: {
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryLightGreyHex,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 1,
  },
  bannerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    padding: SPACING.space_16,
    zIndex: 2,
  },
  bannerSectionTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bannerTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_28,
    color: COLORS.primaryWhiteHex,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  quickActionsRowOverlap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -60,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: SPACING.space_8,
    zIndex: 10,
  },
  quickAction: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIconWrap: {
    position: "relative",
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_10,
    fontWeight: "bold",
  },
  quickActionLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_4,
  },
  quickActionSub: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryDarkGreyHex,
  },
  footer: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_20,
    marginTop: SPACING.space_20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  footerTitle: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    textAlign: "center",
    marginBottom: SPACING.space_16,
  },
  socialLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.space_24,
    marginBottom: SPACING.space_16,
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    width: 100,
  },
  socialText: {
    marginTop: SPACING.space_8,
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryBlackHex,
  },
  featuredContainer: {
    marginVertical: SPACING.space_20,
  },
  FlatListContainer: {
    paddingHorizontal: SPACING.space_20,
    gap: SPACING.space_20,
  },
  CardLinearGradient: {
    borderRadius: BORDERRADIUS.radius_20,
    overflow: "hidden",
    marginRight: SPACING.space_20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  featuredTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_20,
    marginBottom: SPACING.space_10,
    marginTop: SPACING.space_10,
  },
  featuredSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    marginLeft: SPACING.space_20,
    marginBottom: SPACING.space_20,
  },
  coffeeCategoriesContainer: {
    marginTop: SPACING.space_24,
    paddingHorizontal: SPACING.space_20,
  },
  coffeeCategoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.space_16,
  },
  coffeeCategoryItem: {
    width: "48%",
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coffeeCategoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F8E9DB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.space_8,
  },
  coffeeCategoryText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    textAlign: "center",
  },
  additionalOffersContainer: {
    marginTop: SPACING.space_24,
    paddingHorizontal: SPACING.space_24,
  },
  noOffersText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    textAlign: "center",
    marginTop: SPACING.space_20,
  },
  notificationIconContainer: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_10,
    fontFamily: FONTFAMILY.poppins_bold,
  },
});

export default HomeScreen;
