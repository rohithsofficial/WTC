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
  Modal,
  Alert,
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
import { db, auth } from "../../src/firebase/firebase-config";

import * as Location from "expo-location";
import PosterModal from "../../src/components/PosterModel";
import {
  fetchActivePosters,
  Poster,
  getPosters,
} from "../../src/firebase/poster-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useLocation } from "../../src/hooks/useLocation";

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
  { label: "Menu", icon: "restaurant-menu" as const, sub: "View Menu" },
  { label: "Coffee", icon: "grain" as const, sub: "Order Now" },
  { label: "Offers", icon: "local-offer" as const, sub: "Deals" },
  { label: "Cafes", icon: "storefront" as const, sub: "Explore" },
];

// Add banner image URLs
const bannerImages = [
  "https://westernterrain.com/wp-content/uploads/2022/10/wtc_003.jpg",
  "https://westernterrain.com/wp-content/uploads/2022/10/wtc_004.jpg",
  "https://westernterrain.com/wp-content/uploads/2022/10/wtc_001.jpg",
  "https://westernterrain.com/wp-content/uploads/2022/10/wtc_007.jpg",
];

// Add constants for the store location
const STORE_LOCATION = {
  id: "main",
  name: "Western Terrain Coffee Roasters | Kundanahalli",
  coordinates: {
    latitude: 12.3810688,
    longitude: 76.0332978,
  },
  // Maximum allowed distance in kilometers
  maxDistance: 0.5, // 500 meters radius
};


interface UserData {
  message?: string;
  // Add other user properties you expect
  name?: string;
  email?: string;
  preferences?: {
    notifications?: boolean;
    // other preferences
  };
  // Add any other fields your user document might have
}


// Add function to check if user is at the store
const isUserAtStore = (userCoords: { latitude: number; longitude: number }) => {
  const distance = calculateDistance(
    userCoords.latitude,
    userCoords.longitude,
    STORE_LOCATION.coordinates.latitude,
    STORE_LOCATION.coordinates.longitude
  );
  return distance <= STORE_LOCATION.maxDistance;
};

// Add distance calculation function
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number) => {
  return (value * Math.PI) / 180;
};

// Move LocationModal outside of HomeScreen and memoize it
const LocationModal = React.memo(
  ({
    visible,
    onClose,
    storeOptions,
    selectedStore,
    onSelectStore,
    onRequestLocation,
    isGettingLocation,
    userLocation,
  }: {
    visible: boolean;
    onClose: () => void;
    storeOptions: Array<{
      id: string;
      name: string;
      icon: "store" | "business";
      address: string;
    }>;
    selectedStore: string;
    onSelectStore: (storeId: string) => void;
    onRequestLocation: () => void;
    isGettingLocation: boolean;
    userLocation: Location.LocationObject | null;
  }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.locationModalContent}>
          <View style={styles.locationModalHeader}>
            <Text style={styles.locationModalTitle}>Select Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons
                name="close"
                size={24}
                color={COLORS.primaryBlackHex}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.currentLocationButton,
              isGettingLocation && styles.disabledButton,
            ]}
            onPress={onRequestLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primaryOrangeHex} />
            ) : (
              <MaterialIcons
                name="my-location"
                size={24}
                color={COLORS.primaryOrangeHex}
              />
            )}
            <Text style={styles.currentLocationText}>
              {isGettingLocation
                ? "Verifying Location..."
                : "Verify Store Location"}
            </Text>
          </TouchableOpacity>

          <ScrollView style={styles.locationList}>
            {storeOptions.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.locationItem,
                  selectedStore === store.id && styles.selectedLocationItem,
                  userLocation &&
                    isUserAtStore(userLocation.coords) &&
                    styles.availableLocationItem,
                ]}
                onPress={() => onSelectStore(store.id)}
              >
                <View style={styles.locationItemContent}>
                  <MaterialIcons
                    name={store.icon}
                    size={24}
                    color={COLORS.primaryOrangeHex}
                  />
                  <View style={styles.locationItemInfo}>
                    <Text style={styles.locationItemName}>{store.name}</Text>
                    <Text style={styles.locationItemAddress}>
                      {store.address}
                    </Text>
                    {userLocation && (
                      <Text style={styles.locationDistance}>
                        {isUserAtStore(userLocation.coords)
                          ? "You are at this location"
                          : "You must be at this location to order"}
                      </Text>
                    )}
                  </View>
                  {selectedStore === store.id && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={COLORS.primaryOrangeHex}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
);

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
  const [unreadOffersCount, setUnreadOffersCount] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const {
    location: userLocation,
    errorMsg: locationError,
    isLoading: isGettingLocation,
    requestLocationPermission,
  } = useLocation();
  const [showPoster, setShowPoster] = useState(false);
  const [currentPoster, setCurrentPoster] = useState<Poster | null>(null);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  // Store options with icons
  const storeOptions = [
    {
      id: "main",
      name: "Western Terrain Coffee Roasters | Kundanahalli",
      icon: "store" as const,
      address:
        "Madikeri, SH 88 Piriyapatna - Kushalnagar, Road, Kundanahalli, Karnataka 571107",
    },
  ];


  function processNotifications(notificationsData: any[], userData: any) {
  // Implement your notification logic here
}
  // Refs
  const ListRef = useRef<FlatList<Product>>(null);

  // Get bottom tab bar height for proper layout
  const tabBarHeight = useBottomTabBarHeight();

  // Fetch data on component mount
  useEffect(() => {
    console.log("Fetching data...");
    fetchData();
  const loadBanners = async () => {};
  const loadCategories = async () => {};
  const loadFooterOffers = async () => {};
  const loadOffers = async () => {};

    // Set up real-time listeners using React Native Firebase
    const unsubscribeProducts = db.collection('products')
      .onSnapshot((snapshot) => {
        const updatedProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        fetchData(); // Refresh products data
      });

    const unsubscribeCategories = db.collection('categories')
      .onSnapshot((snapshot) => {
        const updatedCategories = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            image: data.image || "",
            icon: data.icon,
            createdAt: data.createdAt || new Date().toISOString(),
          };
        });
        setCategories(updatedCategories);
      });

    const unsubscribeBanners = db.collection('banners')
      .where('isActive', '==', true)
      .onSnapshot((snapshot) => {
        const updatedBanners = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            imageUrl: data.imageUrl || "",
            actionUrl: data.actionUrl || "",
            actionText: data.actionText || "",
            displayOrder: data.displayOrder || 0,
            isActive: data.isActive || false,
            startDate: data.startDate || "",
            endDate: data.endDate || "",
          };
        });
        setBanners(updatedBanners);
      });

    const unsubscribeOffers = db.collection('offers')
      .where('isActive', '==', true)
      .onSnapshot((snapshot) => {
        const updatedOffers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            gradientColors: data.gradientColors || ["#fff", "#eee"],
            isActive: data.isActive || false,
          };
        });
        setOffers(updatedOffers);
      });

    const unsubscribePosters = db.collection('posters')
      .where('isActive', '==', true)
      .onSnapshot((snapshot) => {
        const updatedPosters = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            imageUrl: data.imageUrl || "",
            title: data.title || "",
            description: data.description || "",
            actionUrl: data.actionUrl || "",
            isActive: data.isActive || false,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
          };
        });
        setPosters(updatedPosters);
        if (updatedPosters.length > 0 && isFirstLaunch) {
          setShowPosterModal(true);
        }
      });

    // Cleanup listeners on component unmount
    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeBanners();
      unsubscribeOffers();
      unsubscribePosters();
    };
  }, [isFirstLaunch]);

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
    const timer = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        // Change image after fade out
        setBannerIndex((prev) => (prev + 1) % bannerImages.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }).start();
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [fadeAnim]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setupNotificationsListener(currentUser.uid);
        setupOffersListener(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);


   const setupNotificationsListener = (userId: string) => {
  // Set up real-time listener for notifications using React Native Firebase
  const unsubscribe = db.collection('notifications')
    .where('isActive', '==', true)
    .onSnapshot(
      async (snapshot) => {
        if (!snapshot.empty) {
          const notificationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          try {
            // Get user document to check notification preferences
            const userDocSnapshot = await db.collection('users')
              .doc(userId)
              .get();
            
            if (userDocSnapshot.exists()) {
              const userData = userDocSnapshot.data();
              // Process notifications based on user preferences
              processNotifications(notificationsData, userData);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      },
      (error) => {
        console.error('Error listening to notifications:', error);
      }
    );
  
  return unsubscribe;
};

const setupOffersListener = (userId: string) => {
  // Set up real-time listener for offers using React Native Firebase
  const unsubscribe = db.collection('offers')
    .where('isActive', '==', true)
    .onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const offersData = snapshot.docs.map(doc => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    gradientColors: data.gradientColors,
    isActive: data.isActive,
    // ...add any other required fields
  };
});
setOffers(offersData);
        }
      },
      (error) => {
        console.error('Error listening to offers:', error);
      }
    );
  
  return unsubscribe;
};

// Load posters from Firebase
const loadPosters = async () => {
  try {
    const activePosters = await fetchActivePosters();
    setPosters(activePosters);
    if (activePosters.length > 0) {
      setCurrentPoster(activePosters[0]);
      setShowPoster(true);
    }
  } catch (error) {
    console.error("Error loading posters:", error);
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

// Update the handleAddToCart function
const handleAddToCart = async (item: Product) => {
  try {
    const hasLocation = await requestLocationPermission();
    if (!hasLocation) {
      Alert.alert(
        "Location Required",
        "You must be at Western Terrain Coffee Roasters to place orders. Please visit our store to continue.",
        [
          {
            text: "View on Map",
            onPress: () =>
              Linking.openURL(
                "https://www.google.co.in/maps/place/Western+Terrain+Coffee+Roasters+LLP/@12.9077297,77.5238884,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae3fe896e68309:0x971dd35302249dd3!8m2!3d12.9077297!4d77.5264633!16s%2Fg%2F11syw_tm13!5m1!1e2?entry=ttu&g_ep=EgoyMDI1MDYwNC4wIKXMDSoASAFQAw%3D%3D"
              ),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (!userLocation?.coords) {
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please make sure location services are enabled and try again.",
        [
          {
            text: "Settings",
            onPress: () => Linking.openSettings(),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (!isUserAtStore(userLocation.coords)) {
      Alert.alert(
        "Not at Store Location",
        "You must be at Western Terrain Coffee Roasters to place orders. Please visit our store to continue.",
        [
          {
            text: "View on Map",
            onPress: () =>
              Linking.openURL(
                "https://www.google.co.in/maps/place/Western+Terrain+Coffee+Roasters+LLP/@12.9077297,77.5238884,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae3fe896e68309:0x971dd35302249dd3!8m2!3d12.9077297!4d77.5264633!16s%2Fg%2F11syw_tm13!5m1!1e2?entry=ttu&g_ep=EgoyMDI1MDYwNC4wIKXMDSoASAFQAw%3D%3D"
              ),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
      return;
    }

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addToCart(cartItem);
    calculateCartPrice();
  } catch (error) {
    console.error("Error adding to cart:", error);
    Alert.alert("Error", "Failed to add item to cart. Please try again.", [
      { text: "OK" },
    ]);
  }
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

// Add getFeaturedProducts function
const getFeaturedProducts = () => {
  return allProducts.filter((product) => product.featured);
};

// Update handleLocationSelect to be memoized
const handleLocationSelect = React.useCallback((storeId: string) => {
  setSelectedStore(storeId);
  setShowLocationModal(false);
  ToastAndroid.show("Location updated successfully", ToastAndroid.SHORT);
}, []);

// Update handleCloseLocationModal to be memoized
const handleCloseLocationModal = React.useCallback(() => {
  setShowLocationModal(false);
}, []);

const handleClosePoster = () => {
  setShowPoster(false);
};
 
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (!hasLaunched) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem("hasLaunched", "true");
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error("Error checking first launch:", error);
      }
    };
 
    checkFirstLaunch();
  }, []);
 
  useEffect(() => {
    const fetchPosters = async () => {
      try {
        const fetchedPosters = await fetchActivePosters();
        if (fetchedPosters && fetchedPosters.length > 0) {
          setPosters(fetchedPosters);
          if (isFirstLaunch) {
            setShowPosterModal(true);
          }
        }
      } catch (error) {
        console.error("Error fetching posters:", error);
      }
    };
 
    fetchPosters();
  }, [isFirstLaunch]);
 
  // Add initial loading effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate initial loading time
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsInitialLoading(false);
      } catch (error) {
        console.error("Error during initialization:", error);
        setIsInitialLoading(false);
      }
    };
 
    initializeApp();
  }, []);
 
  // Show loading screen during initial load
  if (isInitialLoading) {
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={[styles.screenContainer, { backgroundColor: "#fae5d3" }]}>
          <LoadingScreen />
        </View>
      </Modal>
    );
  }
 
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
 
  const getProductPrice = (product: Product) => {
    if (product.prices && product.prices.length > 0) {
      // Find the first valid price (not 0, null, or undefined)
      const validPriceObj = product.prices.find(
        (priceObj) =>
          typeof priceObj.price === 'number'
            ? priceObj.price > 0
            : parseFloat(priceObj.price) > 0
      );
      if (validPriceObj) {
        return typeof validPriceObj.price === 'number'
          ? validPriceObj.price
          : parseFloat(validPriceObj.price);
      }
      return 0;
    }
    return 0;
  };
 
  const getImageSource = (imageUrl: string) => {
    if (imageUrl) {
      return { uri: imageUrl };
    }
    return require("../../assets/app_images/fallback.jpg");
  };
 
  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryBlackHex} />
 
      <PosterModal
        visible={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        posters={posters}
      />
 
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocationModal(true)}
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
            onPress={() => router.push("/FavoritesScreen")}
          >
            <MaterialIcons
              name="favorite-border"
              size={24}
              color={COLORS.primaryBlackHex}
            />
          </TouchableOpacity>
 
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/CartScreen")}
          >
            <MaterialIcons
              name="shopping-cart"
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
                      {`${product.prices[0].size} - ${product.prices[0].price} ${product.prices[0].currency}`}
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
            source={{ uri: bannerImages[bannerIndex] }}
            style={styles.banner}
            resizeMode="cover"
          />
        </Animated.View>
        <View style={styles.bannerOverlay} />
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
                {action.label === "Offers" && unreadOffersCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadOffersCount > 99 ? "99+" : unreadOffersCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Text style={styles.quickActionSub}>
                {action.label === "Offers" && unreadOffersCount > 0
                  ? `${unreadOffersCount} New`
                  : action.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
 
      {/* Update LocationModal usage */}
      <LocationModal
        visible={showLocationModal}
        onClose={handleCloseLocationModal}
        storeOptions={storeOptions}
        selectedStore={selectedStore}
        onSelectStore={handleLocationSelect}
        onRequestLocation={requestLocationPermission}
        isGettingLocation={isGettingLocation}
        userLocation={userLocation}
      />
 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollViewContent, { paddingTop: 100 }]}
      >
        {/* Dynamic Hero Section */}
        {currentBanner ? (
          <TouchableOpacity
            style={styles.heroContainer}
            onPress={() => router.push("/OffersScreen")}
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
                  onPress={() => router.push("/OffersScreen")}
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
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setCurrentTopBannerIndex(index);
                    router.push("/OffersScreen");
                  }}
                >
                  <View
                    style={[
                      styles.indicator,
                      index === currentTopBannerIndex && styles.activeIndicator,
                    ]}
                  />
                </TouchableOpacity>
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
                <Image
                  source={{ uri: category.image }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
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
          <View style={styles.featuredHeaderRow}>
            <Text style={styles.featuredTitle}>Featured Products</Text>
            <TouchableOpacity
              onPress={() => setShowAllFeatured(!showAllFeatured)}
            >
              <Text style={styles.seeAllText}>
                {showAllFeatured ? "Show Less" : "See All"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredProductsScroll}
          >
            {getFeaturedProducts().map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.featuredProductCard}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/products/[id]",
                    params: { id: product.id },
                  })
                }
              >
                <Image
                  source={getImageSource(product.imagelink_square)}
                  style={styles.featuredProductImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredProductBadge}>
                  <Text style={styles.featuredProductBadgeText}>Featured</Text>
                </View>
                <View style={styles.featuredProductInfo}>
                  <Text style={styles.featuredProductName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.featuredProductPrice}>
                    ₹{(
                      getProductPrice(product) ||
                      product.offerprice ||
                      0
                    ).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
 
        {/* Coffee Categories */}
        <View style={styles.coffeeCategoriesContainer}>
          <Text style={styles.sectionTitle}>Coffee Beans Categories</Text>
          <View style={styles.coffeeCategoriesGrid}>
            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <Image
                source={require("../../src/assets/medium_roast_01-Photoroom.png")}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <Text style={styles.categoryText}>Coffee Beans</Text>
            </TouchableOpacity>
 
            <TouchableOpacity
  style={styles.coffeeCategoryItem}
  onPress={() => router.push("/HomeScreen1")}
>
  <Image
    source={require("../../src/assets/Filter-Coffee-Medium (1)-Photoroom.png")}
    style={styles.categoryImage}
    resizeMode="cover"
  />
  <Text style={styles.categoryText}>Filter Coffee</Text>
</TouchableOpacity>
 
            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <Image
                source={require("../../src/assets/Red-1-min-Photoroom.png")}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <Text style={styles.categoryText}>Instant Coffee</Text>
            </TouchableOpacity>
 
            <TouchableOpacity
              style={styles.coffeeCategoryItem}
              onPress={() => router.push("/HomeScreen1")}
            >
              <Image
                source={require("../../src/assets/tea_1-Photoroom.png")}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <Text style={styles.categoryText}>Tea</Text>
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
    fontSize: FONTSIZE.size_20,
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
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    borderRadius: 20,
    overflow: "visible",
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
    borderRadius: 20,
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
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_10,
    fontFamily: FONTFAMILY.poppins_bold,
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
    marginVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_16,
    gap: 30,
  },
  featuredHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  featuredTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 18,
    color: COLORS.primaryBlackHex,
  },
  seeAllText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryOrangeHex,
  },
  featuredProductsScroll: {
    paddingLeft: 10,
    paddingRight: 12,
    paddingBottom: 12,
    gap: 16,
  },
  featuredProductCard: {
    width: 160,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 16,
    marginRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 3,
  },
  featuredProductImage: {
    width: "100%",
    height: 190,
  },
  featuredProductBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredProductBadgeText: {
    color: COLORS.primaryWhiteHex,
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: 12,
  },
  featuredProductInfo: {
    padding: 8,
  },
  featuredProductName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryBlackHex,
    marginBottom: 4,
    height: 40,
    flexWrap: "wrap",
  },
  featuredProductPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryOrangeHex,
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
    alignItems: "center",
    marginBottom: SPACING.space_16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  locationModalContent: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderTopRightRadius: BORDERRADIUS.radius_20,
    maxHeight: "80%",
  },
  locationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.space_16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  locationModalTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
  },
  closeButton: {
    padding: SPACING.space_8,
  },
  locationList: {
    padding: SPACING.space_16,
  },
  locationItem: {
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_10,
    marginBottom: SPACING.space_12,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
  },
  selectedLocationItem: {
    borderColor: COLORS.primaryOrangeHex,
    backgroundColor: "#FFF5EB",
  },
  locationItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationItemInfo: {
    flex: 1,
    marginLeft: SPACING.space_12,
  },
  locationItemName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  locationItemAddress: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryDarkGreyHex,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  disabledButton: {
    opacity: 0.7,
  },
  currentLocationText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_12,
  },
  availableLocationItem: {
    borderColor: COLORS.primaryGreenHex,
    backgroundColor: "#F0FFF0",
  },
  locationDistance: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreenHex,
    marginTop: SPACING.space_4,
  },
});
export default HomeScreen;