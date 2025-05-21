import React, { createContext, useContext, useReducer } from 'react';
import { Product } from '../types/database';

interface CartItem {
  id: string;
  name: string;
  imagelink_square: string;
  special_ingredient: string;
  roasted: string;
  price: number;
  size: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: { id: string; size: string } }
  | { type: 'INCREMENT_QUANTITY'; payload: { id: string; size: string } }
  | { type: 'DECREMENT_QUANTITY'; payload: { id: string; size: string } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
  total: 0,
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItemIndex = state.items.findIndex(
        item => item.id === action.payload.id && item.size === action.payload.size
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += action.payload.quantity;
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems),
        };
      }

      const updatedItems = [...state.items, action.payload];
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'REMOVE_FROM_CART': {
      const updatedItems = state.items.filter(
        item => !(item.id === action.payload.id && item.size === action.payload.size)
      );
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'INCREMENT_QUANTITY': {
      const updatedItems = state.items.map(item => {
        if (item.id === action.payload.id && item.size === action.payload.size) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'DECREMENT_QUANTITY': {
      const updatedItems = state.items.map(item => {
        if (item.id === action.payload.id && item.size === action.payload.size) {
          return { ...item, quantity: Math.max(0, item.quantity - 1) };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'CLEAR_CART':
      return initialState;

    default:
      return state;
  }
};

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 