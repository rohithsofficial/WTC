// src/hooks/useFirebaseData.ts
import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { fetchCoffeeProducts, fetchteaProducts, fetchCategories } from '../firebase/product-service';
import { Product, Category } from '../types/interfaces';

/**
 * Custom hook to load and manage Firebase data
 * This can be used in components that need direct access to loading states
 */
export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store actions
  const setCoffeeList = useStore(state => state.setCoffeeList);
  const setteaList = useStore(state => state.setteaList);
  const setCategories = useStore(state => state.setCategories);
  
  // Store state
  const coffeeList = useStore(state => state.CoffeeList);
  const teaList = useStore(state => state.teaList);
  const categories = useStore(state => state.Categories);

  // Function to load all data
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch in parallel to improve loading time
      const [coffeeData, teaData, categoryData] = await Promise.all([
        fetchCoffeeProducts(),
        fetchteaProducts(),
        fetchCategories()
      ]);
      
      // Update store
      setCoffeeList(coffeeData);
      setteaList(teaData);
      setCategories(categoryData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function that can be called from components
  const refreshData = () => {
    loadAllData();
  };

  return {
    isLoading,
    error,
    coffeeList,
    teaList,
    categories,
    refreshData
  };
};