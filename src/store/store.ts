// src/store/store.ts
import {create} from 'zustand';
import {produce} from 'immer';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category, CartItem, OrderHistoryItem } from '../types/interfaces';
import { fetchAllProductsWithCategories } from '../firebase/product-service';

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
  fetchData: () => Promise<void>;
  addToCart: (cartItem: CartItem) => void;
  calculateCartPrice: () => void;
  removeFromCart: (cartItem: CartItem) => void;
  incrementCartItemQuantity: (id: string, size: string) => void;
  decrementCartItemQuantity: (id: string, size: string) => void;
  
}

export const useStore = create<StoreState>((set, get) => ({
  categories: [],
  productsByCategory: [],
  allProducts: [],
  CartList: [],
  CartPrice: 0,
  isLoading: false,
  error: null,


  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const { categories, productsByCategory, allProducts } = await fetchAllProductsWithCategories();
      
      set({ 
        categories,
        productsByCategory,
        allProducts,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: 'Failed to fetch products',
        isLoading: false 
      });
      console.error('Error fetching products:', error);
    }
  },

  addToCart: (cartItem: CartItem) => {
    const { CartList } = get();
    
    // Check if item already exists in cart
    const existingItem = CartList.find(
      item => item.id === cartItem.id && 
      item.prices[0].size === cartItem.prices[0].size
    );

    if (existingItem) {
      // If item exists, increment quantity
      set({
        CartList: CartList.map(item =>
          item.id === cartItem.id && 
          item.prices[0].size === cartItem.prices[0].size
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
    } else {
      // If item doesn't exist, add it to cart
      set({ CartList: [...CartList, cartItem] });
    }
  },

  calculateCartPrice: () => {
    const { CartList } = get();
    const totalPrice = CartList.reduce((total, item) => {
      const itemTotal = item.prices.reduce((priceTotal, price) => {
        return priceTotal + (parseFloat(price.price) * price.quantity);
      }, 0);
      return total + itemTotal;
    }, 0);
    set({ CartPrice: totalPrice });
  },

  removeFromCart: (cartItem: CartItem) => {
    const { CartList } = get();
    set({
      CartList: CartList.filter(
        item => item.id !== cartItem.id || 
        item.prices[0].size !== cartItem.prices[0].size
      )
    });
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
}));
