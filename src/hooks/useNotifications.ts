import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserNotification } from '../types/interfaces';

interface NotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export const useNotifications = (userId: string) => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (userId) {
      setupNotifications();
      loadNotifications();
    }
  }, [userId]);

  const setupNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync();
      
      // Save the token to the user's document
      await updateDoc(doc(db, 'users', userId), {
        pushToken: token.data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(notificationsQuery);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserNotification[];

      const unreadCount = notifications.filter(n => !n.read).length;

      setState({
        notifications,
        unreadCount,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
    }
  };

  const sendNotification = async (
    title: string,
    body: string,
    data?: any,
    type: UserNotification['type'] = 'system'
  ) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Add notification to Firestore
      const notification: Omit<UserNotification, 'id'> = {
        userId,
        title,
        body,
        type,
        data,
        read: false,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'notifications'), notification);

      // Send push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });

      await loadNotifications();
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        updatedAt: new Date(),
      });

      await loadNotifications();
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const batch = db.batch();
      state.notifications
        .filter(n => !n.read)
        .forEach(notification => {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, {
            read: true,
            updatedAt: new Date(),
          });
        });

      await batch.commit();
      await loadNotifications();
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    sendNotification,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}; 