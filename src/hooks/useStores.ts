import { useState, useEffect } from 'react';
import firestore, { collection, getDocs, query, where, orderBy } from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../firebase/firebase-config';
import { Store } from '../types/interfaces';

interface StoreState {
  stores: Store[];
  nearbyStores: Store[];
  selectedStore: Store | null;
  userLocation: Location.LocationObject | null;
  loading: boolean;
  error: string | null;
}

export const useStores = () => {
  const [state, setState] = useState<StoreState>({
    stores: [],
    nearbyStores: [],
    selectedStore: null,
    userLocation: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadStores();
    getUserLocation();
  }, []);

  useEffect(() => {
    if (state.userLocation && state.stores.length > 0) {
      updateNearbyStores();
    }
  }, [state.userLocation, state.stores]);

  const loadStores = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const storesQuery = query(
        collection(db, 'stores'),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(storesQuery);
      const stores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Store[];

      setState(prev => ({
        ...prev,
        stores,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      const location = await Location.getCurrentPositionAsync({});
      setState(prev => ({
        ...prev,
        userLocation: location,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
      }));
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
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

  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  const updateNearbyStores = () => {
    if (!state.userLocation) return;

    const storesWithDistance = state.stores.map(store => {
      const distance = calculateDistance(
        state.userLocation!.coords.latitude,
        state.userLocation!.coords.longitude,
        store.location.latitude,
        store.location.longitude
      );
      return { ...store, distance };
    });

    // Sort by distance and get stores within 10km
    const nearby = storesWithDistance
      .filter(store => store.distance <= 10)
      .sort((a, b) => a.distance - b.distance);

    setState(prev => ({
      ...prev,
      nearbyStores: nearby,
    }));
  };

  const selectStore = (storeId: string) => {
    const store = state.stores.find(s => s.id === storeId);
    setState(prev => ({
      ...prev,
      selectedStore: store || null,
    }));
  };

  const searchStores = async (query: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Search by name, city, or state
      const searchQuery = query.toLowerCase();
      const filteredStores = state.stores.filter(
        store =>
          store.name.toLowerCase().includes(searchQuery) ||
          store.city.toLowerCase().includes(searchQuery) ||
          store.state.toLowerCase().includes(searchQuery)
      );

      setState(prev => ({
        ...prev,
        stores: filteredStores,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
    }
  };

  const filterStoresByFeature = (feature: string) => {
    const filteredStores = state.stores.filter(store =>
      store.features.includes(feature)
    );
    setState(prev => ({
      ...prev,
      stores: filteredStores,
    }));
  };

  const getStoreHours = (store: Store): string => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = store.hours[today];
    return hours ? `${hours.open} - ${hours.close}` : 'Closed';
  };

  const isStoreOpen = (store: Store): boolean => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = store.hours[today];

    if (!hours) return false;

    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;
    const currentTime = currentHour * 60 + currentMinute;

    return currentTime >= openTime && currentTime <= closeTime;
  };

  return {
    stores: state.stores,
    nearbyStores: state.nearbyStores,
    selectedStore: state.selectedStore,
    userLocation: state.userLocation,
    loading: state.loading,
    error: state.error,
    loadStores,
    selectStore,
    searchStores,
    filterStoresByFeature,
    getStoreHours,
    isStoreOpen,
    refresh: loadStores,
  };
}; 