// src/store/store.ts
import {create} from 'zustand';
import {produce} from 'immer';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category, CartItem, OrderHistoryItem } from '../types/interfaces';
import { fetchAllProductsWithCategories } from '../firebase/product-service';
import { auth, db } from '../firebase/config';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

interface StoreState {
  categories: Category[];
  productsByCategory: {
    category: Category;
    products: Product[];
  }[];
  allProducts: Product[];
  CartList: CartItem[];
  CartPrice: number;
  isLoading: boolean;
  error: string | null;
  favorites: Product[];
  fetchData: () => Promise<void>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  calculateCartPrice: () => void;
  incrementCartItemQuantity: (id: string, size: string) => void;
  decrementCartItemQuantity: (id: string, size: string) => void;
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  syncFavorites: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  categories: [],
  productsByCategory: [],
  allProducts: [],
  CartList: [],
  CartPrice: 0,
  isLoading: false,
  error: null,
  favorites: [],

  fetchData: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await fetchAllProductsWithCategories();
      set({
        categories: data.categories,
        productsByCategory: data.productsByCategory,
        allProducts: data.allProducts,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to fetch data', isLoading: false });
    }
  },

  addToCart: (item: CartItem) => {
    set((state) => ({
      CartList: [...state.CartList, item],
    }));
    get().calculateCartPrice();
  },

  removeFromCart: (id: string) => {
    set((state) => ({
      CartList: state.CartList.filter((item) => item.id !== id),
    }));
    get().calculateCartPrice();
  },

  clearCart: () => {
    set(() => ({
      CartList: [],
      CartPrice: 0,
    }));
  },

  calculateCartPrice: () => {
    const total = get().CartList.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    set(() => ({
      CartPrice: total,
    }));
  },

  incrementCartItemQuantity: (id: string, size: string) => {
    const { CartList } = get();
    set({
      CartList: CartList.map(item =>
        item.id === id && item.prices[0].size === size
          ? {
              ...item,
              prices: item.prices.map(price => ({
                ...price,
                quantity: price.quantity + 1
              }))
            }
          : item
      )
    });
  },

  decrementCartItemQuantity: (id: string, size: string) => {
    const { CartList } = get();
    set({
      CartList: CartList.map(item =>
        item.id === id && item.prices[0].size === size && item.prices[0].quantity > 1
          ? {
              ...item,
              prices: item.prices.map(price => ({
                ...price,
                quantity: price.quantity - 1
              }))
            }
          : item
      )
    });
  },

  addToFavorites: async (product: Product) => {
    const { favorites } = get();
    if (!favorites.some(item => item.id === product.id)) {
      const newFavorites = [...favorites, product];
      set({ favorites: newFavorites });
      
      // Sync with Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              favorites: newFavorites.map(fav => fav.id),
              updatedAt: new Date().toISOString()
            });
          } else {
            // If user document doesn't exist, create it with favorites
            await setDoc(userDocRef, {
              favorites: [product.id],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error syncing favorites:', error);
          // Revert local state if Firestore update fails
          set({ favorites });
        }
      }
    }
  },

  removeFromFavorites: async (productId: string) => {
    const { favorites } = get();
    const newFavorites = favorites.filter(item => item.id !== productId);
    set({ favorites: newFavorites });
    
    // Sync with Firestore
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          await updateDoc(userDocRef, {
            favorites: newFavorites.map(fav => fav.id),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error syncing favorites:', error);
        // Revert local state if Firestore update fails
        set({ favorites });
      }
    }
  },

  isFavorite: (productId: string) => {
    const { favorites } = get();
    return favorites.some(item => item.id === productId);
  },

  syncFavorites: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      set({ isLoading: true });
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().favorites) {
        const favoriteIds = userDoc.data().favorites;
        const { allProducts } = get();
        
        // Ensure allProducts are loaded before filtering
        if (allProducts.length === 0) {
          await get().fetchData();
        }
        
        const favoriteProducts = allProducts.filter(product => 
          favoriteIds.includes(product.id)
        );
        set({ favorites: favoriteProducts });
      }
    } catch (error) {
      console.error('Error syncing favorites:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
