import React, { createContext, useReducer, useCallback } from 'react';

export interface CartState {
  // Define the structure of your cart state
}

export interface CartAction {
  // Define the structure of your cart actions
}

export interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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