import React  , {useState} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { useCart } from '../../src/store/CartContext';
import CartItem from '../../src/components/CartItem';
import { FontAwesome } from '@expo/vector-icons';
import { addOrder} from '../../src/firebase/addData';
import { auth } from '../../src/firebase/config';

export default function CartScreen() {
  const { state, dispatch } = useCart();

  const handleIncrementQuantity = (id: string, size: string) => {
    dispatch({ type: 'INCREMENT_QUANTITY', payload: { id, size } });
  };

  const handleDecrementQuantity = (id: string, size: string) => {
    dispatch({ type: 'DECREMENT_QUANTITY', payload: { id, size } });
  };

  const handleRemoveItem = (id: string, size: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { id, size } });
  };

  const handleClearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };



  const [orderType, setOrderType] = useState<'table' | 'takeaway'>('takeaway'); // default is takeaway
  const [tableNumber, setTableNumber] = useState('');



  // In CartScreen, inside handleCheckout (instead of calling addOrder directly)
const handleCheckout = () => {
  if (!auth.currentUser) {
    Alert.alert(
      'Sign In Required',
      'Please sign in to complete your purchase.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]
    );
    return;
  }

  try {
    router.push({
      pathname: '/(app)/PaymentScreen',
      params: {
        items: JSON.stringify(state.items),
        total: state.total.toString(),
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        orderType,
        tableNumber,
      },
    });
  } catch (error) {
    Alert.alert("Checkout Failed", "Something went wrong. Please try again.");
    console.error("Checkout Error:", error);
  }
};

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cart',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {state.items.length === 0 ? (
          <View style={styles.emptyCart}>
            <FontAwesome name="shopping-cart" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => router.push('/HomeScreen')}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView style={styles.itemsContainer}>
              {state.items.map((item, index) => (
                <View key={`${item.id}-${item.size}-${index}`} style={styles.cartItemContainer}>
                  <CartItem
                    key={`cartItem-${item.id}-${item.size}-${index}`}
                    id={item.id}
                    name={item.name}
                    imagelink_square={item.imagelink_square}
                    special_ingredient={item.special_ingredient}
                    roasted={item.roasted}
                    prices={[{ size: item.size, price: item.price, quantity: item.quantity }]}
                    type="coffee"
                    incrementCartItemQuantityHandler={() => handleIncrementQuantity(item.id, item.size)}
                    decrementCartItemQuantityHandler={() => handleDecrementQuantity(item.id, item.size)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item.id, item.size)}
                  >
                    <FontAwesome name="trash" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.orderTypeContainer}>
  <Text style={styles.orderTypeLabel}>Select Order Type:</Text>
  <View style={styles.orderTypeButtons}>
    <TouchableOpacity
      style={[
        styles.orderTypeButton,
        orderType === 'table' && styles.selectedOrderTypeButton,
      ]}
      onPress={() => setOrderType('table')}
    >
      <Text
        style={[
          styles.orderTypeButtonText,
          orderType === 'table' && styles.selectedOrderTypeButtonText,
        ]}
      >
        Table
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.orderTypeButton,
        orderType === 'takeaway' && styles.selectedOrderTypeButton,
      ]}
      onPress={() => setOrderType('takeaway')}
    >
      <Text
        style={[
          styles.orderTypeButtonText,
          orderType === 'takeaway' && styles.selectedOrderTypeButtonText,
        ]}
      >
        Takeaway
      </Text>
    </TouchableOpacity>
  </View>
  {orderType === 'table' && (
    <View style={styles.tableNumberContainer}>
      <Text style={styles.tableNumberLabel}>Table Number:</Text>
      <TextInput
        style={styles.tableNumberInput}
        value={tableNumber}
        onChangeText={setTableNumber}
        keyboardType="numeric"
        placeholder="Enter table number"
      />
    </View>
  )}
</View>

            <View style={styles.footer}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>${state.total.toFixed(2)}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={handleClearCart}
                >
                  <Text style={styles.buttonText}>Clear Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.checkoutButton]}
                  onPress={handleCheckout}
                >
                  <Text style={[styles.buttonText, styles.checkoutButtonText]}>
                    Checkout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  itemsContainer: {
    flex: 1,
    padding: 16,
  },
  cartItemContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  checkoutButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  checkoutButtonText: {
    color: '#fff',
  },
  continueShoppingButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2ecc71',
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderTypeContainer: {
  paddingHorizontal: 16,
  paddingBottom: 8,
},
orderTypeLabel: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 8,
},
orderTypeButtons: {
  flexDirection: 'row',
  gap: 12,
},
orderTypeButton: {
  flex: 1,
  padding: 12,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  alignItems: 'center',
  backgroundColor: '#fff',
},
selectedOrderTypeButton: {
  backgroundColor: '#2ecc71',
  borderColor: '#27ae60',
},
orderTypeButtonText: {
  color: '#333',
  fontWeight: 'bold',
},
selectedOrderTypeButtonText: {
  color: '#fff',
},
tableNumberContainer: {
  marginTop: 16,
  marginBottom: 12,
},

tableNumberLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginBottom: 6,
},

tableNumberInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 12,
  fontSize: 16,
  backgroundColor: '#fff',
  color: '#000',
},

}); 