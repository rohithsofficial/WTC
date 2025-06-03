import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
} from "react-native";
import {
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
  BORDERRADIUS,
} from "../../src/theme/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  fetchNotifications,
  markNotificationAsRead,
  Notification,
} from "../../src/firebase/notification-service";
import { useAuth } from "../../src/context/AuthContext";
import { Timestamp } from "firebase/firestore";

const NotificationScreen = () => {
  const router = useRouter();
  const authContext = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Enhanced debugging
  useEffect(() => {
    console.log("=== AUTH CONTEXT DEBUG ===");
    console.log("Full auth context:", authContext);
    console.log("Auth context keys:", Object.keys(authContext || {}));
    console.log("Auth context type:", typeof authContext);
    console.log("========================");
  }, [authContext]);

  useEffect(() => {
    // Increase timeout to allow more time for auth initialization
    const authTimer = setTimeout(() => {
      console.log("Setting auth initialized to true");
      setAuthInitialized(true);
    }, 1000); // Increased from 500ms to 1000ms

    return () => clearTimeout(authTimer);
  }, []);

  useEffect(() => {
    // Enhanced debug logging
    console.log("=== AUTH STATE CHECK ===");
    console.log("Auth initialized:", authInitialized);
    console.log("Full auth context:", authContext);
    console.log("User from context:", authContext?.user);
    console.log("User exists:", !!authContext?.user);
    console.log("User UID:", authContext?.user?.uid);
    console.log("Is loading from context:", authContext?.isLoading);
    console.log("========================");

    // Only run when auth is initialized
    if (!authInitialized) {
      console.log("Auth not yet initialized, waiting...");
      return;
    }

    // Check if auth is still loading
    if (authContext?.isLoading) {
      console.log("Auth is still loading, waiting...");
      return;
    }

    if (authContext?.user?.uid) {
      console.log("User authenticated, loading notifications for:", authContext.user.uid);
      loadNotifications();
    } else {
      setIsLoading(false);
      console.log("User not authenticated or no UID available");
      console.log("Auth context user:", authContext?.user);
      
      // Show a message to help debug
      ToastAndroid.show("User not authenticated. Please log in.", ToastAndroid.LONG);
    }
  }, [authContext?.user?.uid, authContext?.isLoading, authInitialized]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const userUid = authContext?.user?.uid;
      
      if (!userUid) {
        console.warn("No user ID available for loading notifications");
        setNotifications([]);
        return;
      }
      
      console.log("Fetching notifications for user:", userUid);
      const fetchedNotifications = await fetchNotifications(userUid);
      console.log("Fetched notifications count:", fetchedNotifications.length);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      ToastAndroid.show("Failed to load notifications", ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offer":
        return "local-offer";
      case "order":
        return "shopping-bag";
      case "system":
        return "info";
      default:
        return "notifications";
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      }

      // Handle navigation based on notification type
      switch (notification.type) {
        case "offer":
          router.push("/OffersScreen");
          break;
        case "order":
          router.push("/OrderScreen");
          break;
        // Add more cases as needed
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
      ToastAndroid.show("Failed to update notification", ToastAndroid.SHORT);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    try {
      let date: Date;

      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        console.warn('Invalid timestamp format:', timestamp);
        date = new Date();
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from timestamp:', timestamp);
        return 'Recently';
      }

      const now = new Date();
      const diffInMilliseconds = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
      const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return 'Recently';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <MaterialIcons
          name={getNotificationIcon(item.type)}
          size={24}
          color={COLORS.primaryOrangeHex}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  // Show loading while auth or notifications are loading
  if (isLoading || authContext?.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>
          {authContext?.isLoading ? "Authenticating..." : "Loading notifications..."}
        </Text>
      </View>
    );
  }

  // Show auth required message if user is not authenticated
  if (!authContext?.user) {
    return (
      <View style={styles.container}>
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
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="login"
            size={48}
            color={COLORS.primaryLightGreyHex}
          />
          <Text style={styles.emptyText}>Please log in to view notifications</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("../(auth)/phone-auth.tsx")} // Adjust route as needed
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="notifications-off"
            size={48}
            color={COLORS.primaryLightGreyHex}
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationList}
          refreshing={isLoading}
          onRefresh={loadNotifications}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.space_16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
  },
  backButton: {
    marginRight: SPACING.space_16,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
  },
  notificationList: {
    padding: SPACING.space_16,
  },
  notificationItem: {
    flexDirection: "row",
    padding: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    marginBottom: SPACING.space_12,
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
  },
  unreadNotification: {
    backgroundColor: "#FFF9F5",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8E9DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.space_12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  notificationMessage: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    marginBottom: SPACING.space_4,
  },
  notificationTime: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrangeHex,
    position: "absolute",
    top: SPACING.space_16,
    right: SPACING.space_16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryDarkGreyHex,
    marginTop: SPACING.space_8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.space_24,
  },
  emptyText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    marginTop: SPACING.space_12,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    marginTop: SPACING.space_16,
  },
  loginButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
});

export default NotificationScreen;