//src/firebase/notification-service.ts
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from './firebase-config';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: FirebaseFirestoreTypes.Timestamp;
  isRead: boolean;
  isActive: boolean;
  type: "offer" | "order" | "system";
  userId?: string | null; // Can be string for specific users or null for global
}

// Fetch notifications for a specific user (includes global notifications)
export const fetchNotifications = async (userId?: string) => {
  try {
    const notificationsRef = db.collection("notifications");

    let q;
    if (userId) {
      // Fetch notifications that are either global (userId is null) or specific to this user
      q = notificationsRef
        .where("isActive", "==", true)
        .where("userId", "in", ["global", userId]);
    } else {
      // If no userId provided, fetch only global notifications
      q = notificationsRef
        .where("isActive", "==", true)
        .where("userId", "==", null);
    }

    const querySnapshot = await q.get();
    const notifications = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "Notification",
        message: data.message || "",
        timestamp: data.timestamp || db.FieldValue.serverTimestamp(),
        isRead: data.isRead || false,
        isActive: data.isActive || true,
        type: data.type || "system",
        userId: data.userId, // Keep original value (null or string)
      } as Notification;
    });

    // Sort notifications by timestamp in memory
    return notifications.sort((a, b) => {
      const timeA = a.timestamp instanceof FirebaseFirestoreTypes.Timestamp
        ? a.timestamp.toMillis()
        : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof FirebaseFirestoreTypes.Timestamp
        ? b.timestamp.toMillis()
        : new Date(b.timestamp).getTime();
      return timeB - timeA; // Sort in descending order (newest first)
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    await notificationRef.update({
      isRead: true,
      readAt: db.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Add new notification
export const addNotification = async (
  notification: Omit<Notification, "id">
) => {
  try {
    const notificationsRef = db.collection("notifications");
    const newNotification = {
      ...notification,
      timestamp: db.FieldValue.serverTimestamp(),
      isRead: false,
      isActive: true,
      userId: notification.userId || null, // Ensure it's null instead of undefined
    };
    await notificationsRef.add(newNotification);
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId: string) => {
  try {
    const notificationRef = db.collection("notifications").doc(notificationId);
    await notificationRef.delete();
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Get unread notification count for a specific user
export const getUnreadNotificationCount = async (userId?: string) => {
  try {
    const notificationsRef = db.collection("notifications");

    let q;
    if (userId) {
      q = notificationsRef
        .where("isActive", "==", true)
        .where("isRead", "==", false)
        .where("userId", "in", ["global", userId]);
    } else {
      q = notificationsRef
        .where("isActive", "==", true)
        .where("isRead", "==", false)
        .where("userId", "==", null);
    }

    const querySnapshot = await q.get();
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    throw error;
  }
};

// Listen for notification changes
export const subscribeToNotifications = (
  userId: string | undefined,
  callback: (count: number) => void
) => {
  const notificationsRef = db.collection("notifications");

  let q;
  if (userId) {
    q = notificationsRef
      .where("isActive", "==", true)
      .where("isRead", "==", false)
      .where("userId", "in", ["global", userId]);
  } else {
    q = notificationsRef
      .where("isActive", "==", true)
      .where("isRead", "==", false)
      .where("userId", "==", null);
  }

  return q.onSnapshot((snapshot) => {
    callback(snapshot.size);
  });
};