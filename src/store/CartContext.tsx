import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

interface CartItem {
  id: string;
  name: string;
  imagelink_square: string;
  special_ingredient?: string;
  roasted?: string;
  type?: string;
  size: string;
  price: string;
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
  | { type: 'CLEAR_CART' }
  | { type: 'REFRESH_CART' };

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
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + action.payload.quantity,
        };
        return {
          items: updatedItems,
          total: calculateTotal(updatedItems),
        };
      }

      const newItems = [...state.items, action.payload];
      return {
        items: newItems,
        total: calculateTotal(newItems),
      };
    }

    case 'REMOVE_FROM_CART': {
      const filteredItems = state.items.filter(
        item => !(item.id === action.payload.id && item.size === action.payload.size)
      );
      return {
        items: filteredItems,
        total: calculateTotal(filteredItems),
      };
    }

    case 'INCREMENT_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id && item.size === action.payload.size
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      return {
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'DECREMENT_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id && item.size === action.payload.size
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      );
      return {
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
      };

    case 'REFRESH_CART':
      return {
        ...state,
        total: calculateTotal(state.items),
      };

    default:
      return state;
  }
};

// Helper function to calculate total
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => {
    const price = parseFloat(item.price);
    return sum + (price * item.quantity);
  }, 0);
};

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  return (
    <CartContext.Provider value={{ state, dispatch, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}; 