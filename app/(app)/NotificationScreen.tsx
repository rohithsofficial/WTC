//NotificationScreen.tsx
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
import {
  auth,
  db,
  onAuthStateChanged,
  FirebaseFirestoreTypes,
  FirebaseAuthTypes,
} from "../../src/firebase/firebase-config";
import { Swipeable } from "react-native-gesture-handler";

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newProducts: boolean;
  deliveryUpdates: boolean;
  systemNotifications: boolean;
}

const NotificationScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (currentUser) => {
      console.log("Auth state changed:", currentUser?.uid);
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = db.collection("users").doc(currentUser.uid);

          // Set up listener for user document changes
          const unsubscribeUser = userDocRef.onSnapshot((doc) => {
            if (doc.exists()) {
              console.log("User data updated:", doc.data());
              setUserData(doc.data());
              const newSettings = doc.data()?.notificationSettings || null;
              setNotificationSettings(newSettings);

              // Reload notifications when settings change
              if (currentUser.uid) {
                loadNotifications(currentUser.uid);
              }
            }
          });

          // Initial load
          const userDoc = await userDocRef.get();
          if (userDoc.exists()) {
            console.log("User data found:", userDoc.data());
            setUserData(userDoc.data());
            setNotificationSettings(
              userDoc.data()?.notificationSettings || null
            );
            setupNotificationsListener(currentUser.uid);
          }

          return () => unsubscribeUser();
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const setupNotificationsListener = (userId: string) => {
    const notificationsRef = db.collection("notifications");
    const notificationsQuery = notificationsRef.where("isActive", "==", true);

    // Set up real-time listener for notifications
    const unsubscribe = notificationsQuery.onSnapshot(async (snapshot) => {
      try {
        // Get latest notification settings from database
        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();
        const currentSettings = userDoc.exists()
          ? userDoc.data()?.notificationSettings
          : null;

        if (!currentSettings) {
          console.log("No notification settings found");
          setNotifications([]);
          setUnreadCount(0);
          setIsLoading(false);
          return;
        }

        const notificationList: Notification[] = [];
        let unread = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const notificationUserId = data.userId;
          const notificationType = data.type || "system";

          // Check if notifications are enabled for this type in the database
          let isNotificationEnabled = false;

          switch (notificationType) {
            case "order":
              isNotificationEnabled = currentSettings.orderUpdates;
              break;
            case "promotion":
              isNotificationEnabled = currentSettings.promotions;
              break;
            case "newProduct":
              isNotificationEnabled = currentSettings.newProducts;
              break;
            case "delivery":
              isNotificationEnabled = currentSettings.deliveryUpdates;
              break;
            case "system":
              isNotificationEnabled = currentSettings.systemNotifications;
              break;
            default:
              isNotificationEnabled = false;
          }

          const isGlobalNotification = notificationUserId === null;
          const isUserSpecificNotification = notificationUserId === userId;

          // Only add notification if it's enabled in settings
          if (
            (isGlobalNotification || isUserSpecificNotification) &&
            isNotificationEnabled
          ) {
            const notification = {
              id: doc.id,
              title: data.title || "Notification",
              message: data.message || "",
              timestamp: data.timestamp || new Date(),
              isRead: data.isRead || false,
              isActive: data.isActive || true,
              type: notificationType,
              userId: notificationUserId,
            };

            notificationList.push(notification);
            if (!notification.isRead) {
              unread++;
            }
          }
        });

        // Sort notifications by timestamp
        notificationList.sort((a, b) => {
          const getTimestamp = (timestamp: any): number => {
            if (timestamp instanceof Date) {
              return timestamp.getTime();
            } else if (timestamp && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().getTime();
            } else if (timestamp && timestamp.seconds) {
              // Firestore Timestamp object
              return timestamp.seconds * 1000;
            } else {
              return new Date(timestamp).getTime();
            }
          };
          
          const timeA = getTimestamp(a.timestamp);
          const timeB = getTimestamp(b.timestamp);
          return timeB - timeA;
        });

        console.log("Filtered notifications:", notificationList.length);
        setNotifications(notificationList);
        setUnreadCount(unread);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing notifications:", error);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  };

  const loadNotifications = async (userId: string) => {
    try {
      setIsLoading(true);
      console.log("Starting notification fetch...");
      console.log("Current user ID:", userId);

      // Get latest notification settings from database
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      const currentSettings = userDoc.exists()
        ? userDoc.data()?.notificationSettings
        : null;

      if (!currentSettings) {
        console.log("No notification settings found");
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const notificationsRef = db.collection("notifications");
      const notificationsQuery = notificationsRef.where("isActive", "==", true);

      const querySnapshot = await notificationsQuery.get();
      const notificationList: Notification[] = [];
      let unread = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const notificationUserId = data.userId;
        const notificationType = data.type || "system";

        // Check if notifications are enabled for this type in the database
        let isNotificationEnabled = false;

        switch (notificationType) {
          case "order":
            isNotificationEnabled = currentSettings.orderUpdates;
            break;
          case "promotion":
            isNotificationEnabled = currentSettings.promotions;
            break;
          case "newProduct":
            isNotificationEnabled = currentSettings.newProducts;
            break;
          case "delivery":
            isNotificationEnabled = currentSettings.deliveryUpdates;
            break;
          case "system":
            isNotificationEnabled = currentSettings.systemNotifications;
            break;
          default:
            isNotificationEnabled = false;
        }

        const isGlobalNotification = notificationUserId === null;
        const isUserSpecificNotification = notificationUserId === userId;

        // Only add notification if it's enabled in settings
        if (
          (isGlobalNotification || isUserSpecificNotification) &&
          isNotificationEnabled
        ) {
          const notification = {
            id: doc.id,
            title: data.title || "Notification",
            message: data.message || "",
            timestamp: data.timestamp || new Date(),
            isRead: data.isRead || false,
            isActive: data.isActive || true,
            type: notificationType,
            userId: notificationUserId,
          };

          notificationList.push(notification);
          if (!notification.isRead) {
            unread++;
          }
        }
      });

      notificationList.sort((a, b) => {
        const getTimestamp = (timestamp: any): number => {
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          } else if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
          } else if (timestamp && timestamp.seconds) {
            // Firestore Timestamp object
            return timestamp.seconds * 1000;
          } else {
            return new Date(timestamp).getTime();
          }
        };
        
        const timeA = getTimestamp(a.timestamp);
        const timeB = getTimestamp(b.timestamp);
        return timeB - timeA;
      });

      console.log("Filtered notifications:", notificationList.length);
      setNotifications(notificationList);
      setUnreadCount(unread);
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
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      switch (notification.type) {
        case "offer":
          router.push("/OffersScreen");
          break;
        case "order":
          router.push("/OrderScreen");
          break;
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
      ToastAndroid.show("Failed to update notification", ToastAndroid.SHORT);
    }
  };

  const formatTimestamp = (timestamp: string | Date | any) => {
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp && typeof timestamp.toDate === 'function') {
      // Firebase Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp && timestamp.seconds) {
      // Firestore Timestamp object with seconds property
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const notificationRef = db.collection("notifications").doc(notificationId);
      await notificationRef.update({
        isActive: false,
      });
      ToastAndroid.show("Notification deleted", ToastAndroid.SHORT);
    } catch (error) {
      console.error("Error deleting notification:", error);
      ToastAndroid.show("Failed to delete notification", ToastAndroid.SHORT);
    }
  };

  const renderRightActions = (notificationId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteNotification(notificationId)}
      >
        <MaterialIcons name="delete" size={24} color={COLORS.primaryWhiteHex} />
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      rightThreshold={40}
    >
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
    </Swipeable>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
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
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/NotificationSettings")}
        >
          <MaterialIcons
            name="settings"
            size={24}
            color={COLORS.primaryBlackHex}
          />
        </TouchableOpacity>
        {unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="notifications-off"
            size={48}
            color={COLORS.primaryLightGreyHex}
          />
          <Text style={styles.emptyText}>
            {!user
              ? "Please login to view notifications"
              : !notificationSettings
              ? "Please enable notifications in settings"
              : "No notifications yet"}
          </Text>
          {!user ? (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          ) : (
            !notificationSettings && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push("/NotificationSettings")}
              >
                <Text style={styles.settingsButtonText}>
                  Enable Notifications
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationList}
          refreshing={isLoading}
          onRefresh={() => user?.uid && loadNotifications(user.uid)}
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
  },
  badgeContainer: {
    position: "absolute",
    right: SPACING.space_16,
    top: SPACING.space_16,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.space_4,
  },
  badgeText: {
    color: COLORS.primaryWhiteHex,
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
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
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  settingsButton: {
    padding: SPACING.space_8,
  },
  settingsButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginTop: SPACING.space_16,
  },
  deleteAction: {
    backgroundColor: COLORS.primaryRedHex,
    justifyContent: "center",
    alignItems: "center",
    top: 5,
    borderRadius: 10,
    width: 60,
    height: "80%",
  },
});

export default NotificationScreen;