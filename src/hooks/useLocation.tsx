//src/hooks/useLocation.ts
import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Alert, Platform, Linking } from "react-native";

interface LocationState {
  location: Location.LocationObject | null;
  errorMsg: string | null;
  isLoading: boolean;
}

export const useLocation = () => {
  const [state, setState] = useState<LocationState>({
    location: null,
    errorMsg: null,
    isLoading: true,
  });

  const requestLocationPermission = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, errorMsg: null }));

      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Linking.openSettings() },
          ]
        );
        setState((prev) => ({
          ...prev,
          errorMsg: "Location services are disabled",
          isLoading: false,
        }));
        return false;
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please grant location permission to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Linking.openSettings() },
          ]
        );
        setState((prev) => ({
          ...prev,
          errorMsg: "Permission to access location was denied",
          isLoading: false,
        }));
        return false;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!location || !location.coords) {
        setState((prev) => ({
          ...prev,
          errorMsg: "Failed to get location coordinates",
          isLoading: false,
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        location,
        errorMsg: null,
        isLoading: false,
      }));
      return true;
    } catch (error) {
      console.error("Error getting location:", error);
      setState((prev) => ({
        ...prev,
        errorMsg: "Failed to get location",
        isLoading: false,
      }));
      return false;
    }
  };

  const verifyLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return false;
    }

    return true;
  };

  return {
    location: state.location,
    errorMsg: state.errorMsg,
    isLoading: state.isLoading,
    requestLocationPermission,
    verifyLocation,
  };
};