import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ImageBackground,
  TextInput,
  ToastAndroid,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import {
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
  BORDERRADIUS,
} from "../../src/theme/theme";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

const { width } = Dimensions.get("window");

// Mock data for team members
const teamMembers = [
  {
    id: "1",
    name: "John Smith",
    role: "Head Barista",
    image: "https://example.com/barista1.jpg",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    role: "Coffee Roaster",
    image: "https://example.com/roaster1.jpg",
  },
  {
    id: "3",
    name: "Mike Brown",
    role: "Pastry Chef",
    image: "https://example.com/chef1.jpg",
  },
];

// Mock data for blog posts
const blogPosts = [
  {
    id: "1",
    title: "The Art of Coffee Roasting",
    excerpt:
      "Discover the intricate process of roasting the perfect coffee bean...",
    image: "https://example.com/blog1.jpg",
    date: "May 15, 2024",
  },
  {
    id: "2",
    title: "Sustainable Coffee Farming",
    excerpt: "How we're supporting sustainable coffee farming practices...",
    image: "https://example.com/blog2.jpg",
    date: "May 10, 2024",
  },
];

// Mock data for videos
const videos = [
  {
    id: "1",
    title: "Behind the Scenes: Coffee Roasting",
    thumbnail: "https://example.com/video1.jpg",
    duration: "5:30",
  },
  {
    id: "2",
    title: "Meet Our Team",
    thumbnail: "https://example.com/video2.jpg",
    duration: "3:45",
  },
];

// Add type definition for store location
interface StoreLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  hours: string;
}

export default function ExploreScreen() {
  const [activeSection, setActiveSection] = useState("about");
  const scrollViewRef = useRef<ScrollView>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedStoreLocation, setSelectedStoreLocation] =
    useState<StoreLocation | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 12.3810688,
    longitude: 76.0332978,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Store locations with coordinates
  const storeLocations = [
    {
      id: "main",
      name: "Western Terrain Coffee Roasters | Kundanahalli",
      address:
        "Madikeri, SH 88 Piriyapatna - Kushalnagar, Road, Kundanahalli, Karnataka 571107",
      coordinates: {
        latitude: 12.3810688,
        longitude: 76.0332978,
      },
      phone: "+1 234 567 8900",
      hours: "Mon-Sun: 7:00 AM - 10:00 PM",
    },
  ];

  const handleTabPress = (section: string) => {
    setActiveSection(section);
    if (section === "environment") {
      // Scroll to show the next tab
      scrollViewRef.current?.scrollTo({ x: 200, animated: true });
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "about":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Our Cafe</Text>
            <Text style={styles.sectionText}>
              Welcome to Western Terrain Coffee Roasters, where passion meets
              perfection in every cup. Founded in 2015, we've been dedicated to
              bringing you the finest coffee experience in Bangalore.
            </Text>
            <Text style={styles.sectionText}>
              Our journey began with a simple mission: to source the best coffee
              beans from around the world and roast them to perfection. Today,
              we continue to uphold this commitment while creating a warm and
              welcoming space for coffee enthusiasts.
            </Text>
          </View>
        );
      case "history":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our History</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineYear}>2015</Text>
                <Text style={styles.timelineText}>
                  Western Terrain Coffee Roasters was founded
                </Text>
              </View>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineYear}>2017</Text>
                <Text style={styles.timelineText}>
                  Expanded to our second location
                </Text>
              </View>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineYear}>2019</Text>
                <Text style={styles.timelineText}>
                  Launched our coffee roasting facility
                </Text>
              </View>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineYear}>2023</Text>
                <Text style={styles.timelineText}>
                  Won Best Coffee Shop in Bangalore
                </Text>
              </View>
            </View>
          </View>
        );
      case "team":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Team</Text>
            <FlatList
              data={teamMembers}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.teamMemberCard}>
                  {/* <Image
                    source={{ uri: item.image }}
                    style={styles.teamMemberImage}
                    defaultSource={require("../../src/assets/coffee_assets/americano/portrait/americano_pic_1_portrait.png")}
                  /> */}
                  <Text style={styles.teamMemberName}>{item.name}</Text>
                  <Text style={styles.teamMemberRole}>{item.role}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.teamList}
            />
          </View>
        );
      case "environment":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Environment</Text>
            <View style={styles.environmentCard}>
              <MaterialIcons
                name="eco"
                size={40}
                color={COLORS.primaryOrangeHex}
              />
              <Text style={styles.environmentTitle}>Sustainability</Text>
              <Text style={styles.environmentText}>
                We're committed to sustainable practices, from sourcing to
                serving. Our coffee cups are biodegradable, and we actively
                participate in recycling programs.
              </Text>
            </View>
            <View style={styles.environmentCard}>
              <MaterialIcons
                name="groups"
                size={40}
                color={COLORS.primaryOrangeHex}
              />
              <Text style={styles.environmentTitle}>Community</Text>
              <Text style={styles.environmentText}>
                We support local farmers and communities through fair trade
                practices and regular community events.
              </Text>
            </View>
          </View>
        );
      case "blog":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Blog Posts</Text>
            {blogPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.blogCard}>
                {/* <Image
                  source={{ uri: post.image }}
                  style={styles.blogImage}
                  defaultSource={require("../../src/assets/coffee_assets/americano/portrait/americano_pic_1_portrait.png")}
                /> */}
                <View style={styles.blogContent}>
                  <Text style={styles.blogTitle}>{post.title}</Text>
                  <Text style={styles.blogExcerpt}>{post.excerpt}</Text>
                  <Text style={styles.blogDate}>{post.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      case "videos":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Videos</Text>
            <FlatList
              data={videos}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.videoCard}>
                  {/* <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.videoThumbnail}
                    defaultSource={require("../../src/assets/coffee_assets/americano/portrait/americano_pic_1_portrait.png")}
                  /> */}
                  <View style={styles.videoOverlay}>
                    <Ionicons
                      name="play-circle"
                      size={40}
                      color={COLORS.primaryWhiteHex}
                    />
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{item.title}</Text>
                    <Text style={styles.videoDuration}>{item.duration}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.videoList}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "About Us",
          headerStyle: { backgroundColor: COLORS.primaryWhiteHex },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: FONTFAMILY.poppins_semibold,
            fontSize: FONTSIZE.size_18,
          },
        }}
      />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={{ uri: "https://example.com/cafe-header.jpg" }}
          style={styles.headerImage}
          // defaultSource={require("../../src/assets/coffee_assets/americano/portrait/americano_pic_1_portrait.png")}
        >
          <View style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            {/* <Image
              source={require("../../src/assets/coffee_assets/americano/portrait/americano_pic_1_portrait.png")}
              style={styles.logo}
            /> */}
            <Text style={styles.headerTitle}>Western Terrain</Text>
            <Text style={styles.headerSubtitle}>Coffee Roasters</Text>
            <Text style={styles.headerDescription}>
              Crafting exceptional coffee experiences since 2015
            </Text>
          </View>
        </ImageBackground>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.navTabsContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navTabs}
          contentContainerStyle={styles.navTabsContent}
        >
          {["about", "history", "team", "environment", "blog", "videos"].map(
            (section) => (
              <TouchableOpacity
                key={section}
                style={[
                  styles.navTab,
                  activeSection === section && styles.activeNavTab,
                ]}
                onPress={() => handleTabPress(section)}
              >
                <Text
                  style={[
                    styles.navTabText,
                    activeSection === section && styles.activeNavTabText,
                  ]}
                  numberOfLines={1}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainContent}
      >
        {/* Content Section */}
        <View style={styles.contentSection}>{renderSection()}</View>

        {/* Store Locator Section */}
        <View style={styles.storeLocatorContainer}>
          <Text style={styles.sectionTitle}>Find a Store</Text>

          {/* Search Bar */}
          <View style={styles.mapSearchContainer}>
            <TextInput
              style={styles.mapSearchInput}
              placeholder="Search location..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.primaryDarkGreyHex}
            />
            <TouchableOpacity
              style={styles.mapSearchButton}
              onPress={() => {
                ToastAndroid.show(
                  "Search functionality coming soon!",
                  ToastAndroid.SHORT
                );
              }}
            >
              <MaterialIcons
                name="search"
                size={24}
                color={COLORS.primaryOrangeHex}
              />
            </TouchableOpacity>
          </View>

          {/* Map View */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
              zoomEnabled={true}
              scrollEnabled={true}
              rotateEnabled={true}
            >
              {storeLocations.map((store) => (
                <Marker
                  key={store.id}
                  coordinate={store.coordinates}
                  title={store.name}
                  description={store.address}
                  onPress={() => setSelectedStoreLocation(store)}
                >
                  <View style={styles.markerContainer}>
                    <MaterialIcons
                      name="store"
                      size={24}
                      color={COLORS.primaryOrangeHex}
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>

          {/* Store List */}
          <View style={styles.storeListContainer}>
            {storeLocations.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeCard,
                  selectedStoreLocation?.id === store.id &&
                    styles.selectedStoreCard,
                ]}
                onPress={() => {
                  setSelectedStoreLocation(store);
                  setMapRegion({
                    ...mapRegion,
                    latitude: store.coordinates.latitude,
                    longitude: store.coordinates.longitude,
                  });
                }}
              >
                <View style={styles.storeCardContent}>
                  <MaterialIcons
                    name="store"
                    size={24}
                    color={COLORS.primaryOrangeHex}
                  />
                  <View style={styles.storeCardInfo}>
                    <Text style={styles.storeCardName}>{store.name}</Text>
                    <Text style={styles.storeCardAddress}>{store.address}</Text>
                    <Text style={styles.storeCardHours}>{store.hours}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.directionsButton}
                    onPress={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.latitude},${store.coordinates.longitude}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons
                      name="navigate"
                      size={24}
                      color={COLORS.primaryOrangeHex}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  navTabsContainer: {
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  navTabs: {
    flexGrow: 0,
  },
  navTabsContent: {
    paddingHorizontal: SPACING.space_16,
    alignItems: "center",
  },
  navTab: {
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    marginRight: SPACING.space_12,
    minHeight: 50,
    justifyContent: "center",
  },
  activeNavTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryOrangeHex,
  },
  navTabText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    textAlign: "center",
  },
  activeNavTabText: {
    color: COLORS.primaryOrangeHex,
  },
  mainContent: {
    flexGrow: 1,
  },
  contentSection: {
    padding: SPACING.space_16,
  },
  section: {
    marginBottom: SPACING.space_24,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_16,
  },
  sectionText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    lineHeight: 24,
    marginBottom: SPACING.space_12,
  },
  timeline: {
    marginTop: SPACING.space_16,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: SPACING.space_16,
  },
  timelineYear: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    width: 80,
  },
  timelineText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    flex: 1,
  },
  teamList: {
    paddingRight: SPACING.space_16,
  },
  teamMemberCard: {
    width: 160,
    marginRight: SPACING.space_16,
    alignItems: "center",
  },
  teamMemberImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.space_8,
  },
  teamMemberName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  teamMemberRole: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryDarkGreyHex,
  },
  environmentCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  environmentTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginVertical: SPACING.space_8,
  },
  environmentText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    lineHeight: 24,
  },
  blogCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginBottom: SPACING.space_16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  blogImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  blogContent: {
    padding: SPACING.space_16,
  },
  blogTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  blogExcerpt: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    marginBottom: SPACING.space_8,
  },
  blogDate: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
  },
  videoList: {
    paddingRight: SPACING.space_16,
  },
  videoCard: {
    width: 280,
    marginRight: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: "hidden",
    backgroundColor: COLORS.primaryWhiteHex,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoThumbnail: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: {
    padding: SPACING.space_12,
  },
  videoTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  videoDuration: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryDarkGreyHex,
  },
  headerContainer: {
    height: 250,
    marginBottom: SPACING.space_16,
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.space_16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.space_12,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_28,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  headerSubtitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_8,
  },
  headerDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    textAlign: "center",
    opacity: 0.9,
  },
  storeLocatorContainer: {
    marginVertical: SPACING.space_20,
    paddingHorizontal: SPACING.space_16,
  },
  mapSearchContainer: {
    flexDirection: "row",
    marginHorizontal: SPACING.space_20,
    marginBottom: SPACING.space_15,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapSearchInput: {
    flex: 1,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    paddingHorizontal: SPACING.space_10,
  },
  mapSearchButton: {
    padding: SPACING.space_10,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: "hidden",
    marginBottom: SPACING.space_20,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_10,
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
  },
  storeListContainer: {
    paddingHorizontal: SPACING.space_20,
  },
  storeCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_15,
    marginBottom: SPACING.space_15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedStoreCard: {
    borderWidth: 2,
    borderColor: COLORS.primaryOrangeHex,
  },
  storeCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeCardInfo: {
    flex: 1,
    marginLeft: SPACING.space_15,
  },
  storeCardName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  storeCardAddress: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    marginBottom: SPACING.space_4,
  },
  storeCardHours: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryOrangeHex,
  },
  directionsButton: {
    padding: SPACING.space_10,
  },
});
