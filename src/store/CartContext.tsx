import React, { createContext, useContext, useReducer, ReactNode } from 'react';

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
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
        };
        return {
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
        };
      }

      const newItems = [...state.items, { ...action.payload, quantity: 1 }];
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
      };
    }

    case 'REMOVE_FROM_CART': {
      const filteredItems = state.items.filter(
        item => !(item.id === action.payload.id && item.size === action.payload.size)
      );
      return {
        items: filteredItems,
        total: filteredItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
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
        total: updatedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
      };
    }

    case 'DECREMENT_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id && item.size === action.payload.size
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      ).filter(item => item.quantity > 0);
      return {
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
      };
    }

    case 'CLEAR_CART':
      return initialState;

    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
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

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}; 