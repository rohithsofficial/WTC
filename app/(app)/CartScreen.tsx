import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useCart } from '../../src/store/CartContext';
import CartItem from '../../src/components/CartItem';
import { FontAwesome } from '@expo/vector-icons';
import { auth } from '../../src/firebase/config';
import {
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
  BORDERRADIUS,
} from '../../src/theme/theme';

export default function CartScreen() {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { state, dispatch } = useCart();
  const [orderType, setOrderType] = useState('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  const [baristaNotes, setBaristaNotes] = useState('');

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

  const handleCheckout = () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to complete your purchase.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    try {
      // Create a clean state object with only necessary data
      const checkoutData = {
        items: state.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          type: item.type
        })),
        total: state.total,
        orderType,
        tableNumber: orderType === 'dinein' ? tableNumber : '',
        baristaNotes: baristaNotes.trim()
      };

      router.push({
        pathname: '/(app)/PaymentScreen',
        params: {
          state: JSON.stringify(checkoutData),
          amount: state.total.toString(),
          userId: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || ''
        }
      });
    } catch (error) {
      Alert.alert('Checkout Failed', 'Something went wrong. Please try again.');
      console.error('Checkout Error:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Cart', headerShown: false }} />
      <View style={styles.screenContainer}>
        <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
        <View style={styles.mainHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Cart</Text>
            <Text style={styles.headerSubtitle}>Review your order</Text>
          </View>
          <TouchableOpacity style={styles.appIconButton} onPress={() => router.push('/(app)/HomeScreen')}>
            <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Cart: {state.items?.length || 0} items, Total: ₹{state.total?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.debugText}>User: {auth.currentUser ? auth.currentUser.displayName || auth.currentUser.email : 'Not signed in'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          {state.items.length === 0 ? (
            <View style={styles.emptyCart}>
              <FontAwesome name="shopping-cart" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <TouchableOpacity style={styles.continueShoppingButton} onPress={() => router.push('/MenuScreen')}>
                <Text style={styles.continueShoppingText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.itemsContainer} contentContainerStyle={{ paddingBottom: 220 }}>
                {state.items.map((item, index) => (
                  <View key={`${item.id}-${item.size}-${index}`} style={styles.cartItemContainer}>
                    <CartItem
                      id={item.id}
                      name={item.name}
                      imagelink_square={{ uri: item.imagelink_square }}
                      special_ingredient={item.special_ingredient || 'No special ingredients'}
                      roasted={item.roasted || 'Medium Roast'}
                      prices={[{ size: item.size, price: item.price, quantity: item.quantity }]}
                      type={item.type || 'coffee'}
                      incrementCartItemQuantityHandler={() => handleIncrementQuantity(item.id, item.size)}
                      decrementCartItemQuantityHandler={() => handleDecrementQuantity(item.id, item.size)}
                      onImagePress={() => router.push({ pathname: '/(app)/products/[id]', params: { id: item.id } })}
                    />
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item.id, item.size)}>
                      <FontAwesome name="trash" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.footerAbsolute}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₹{state.total.toFixed(2)}</Text>
                </View>
                <View style={styles.notesContainer}>
                  <TextInput
                    style={styles.notesInput}
                    value={baristaNotes}
                    onChangeText={setBaristaNotes}
                    placeholder="Add a note for the barista (optional)"
                    placeholderTextColor={COLORS.primaryGreyHex}
                    multiline
                    numberOfLines={2}
                  />
                </View>
                <View style={styles.orderTypeFooterRow}>
                  <TouchableOpacity
                    style={[styles.orderTypeButton, orderType === 'dinein' && styles.selectedOrderTypeButton]}
                    onPress={() => setOrderType('dinein')}
                  >
                    <Text style={[styles.orderTypeButtonText, orderType === 'dinein' && styles.selectedOrderTypeButtonText]}>Dine In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderTypeButton, orderType === 'takeaway' && styles.selectedOrderTypeButton]}
                    onPress={() => setOrderType('takeaway')}
                  >
                    <Text style={[styles.orderTypeButtonText, orderType === 'takeaway' && styles.selectedOrderTypeButtonText]}>Takeaway</Text>
                  </TouchableOpacity>
                  {orderType === 'dinein' && (
                    <View style={styles.tableNumberInputFooterContainer}>
                      <TextInput
                        style={styles.tableNumberInputFooter}
                        value={tableNumber}
                        onChangeText={setTableNumber}
                        keyboardType="numeric"
                        placeholder="Table Number"
                        placeholderTextColor={COLORS.primaryGreyHex}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearCart}>
                    <Text style={styles.buttonText}>Clear Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.checkoutButton]} onPress={handleCheckout}>
                    <Text style={[styles.buttonText, styles.checkoutButtonText]}>Proceed to Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <Modal visible={showSignInModal} transparent animationType="fade" onRequestClose={() => setShowSignInModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Sign In Required</Text>
              <Text style={styles.modalMessage}>Please sign in to complete your purchase.</Text>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowSignInModal(false)}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSignInButton}
                  onPress={() => {
                    setShowSignInModal(false);
                    router.push('/(auth)/login');
                  }}
                >
                  <Text style={styles.modalSignInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}




const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: 28,
    color: COLORS.primaryBlackHex,
  },
  headerSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: 16,
    color: COLORS.primaryGreyHex,
  },
  appIconButton: {
    padding: 8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  // Debug styles - Remove in production
  debugContainer: {
    padding: SPACING.space_12,
    backgroundColor: COLORS.primaryOrangeHex,
    marginHorizontal: SPACING.space_16,
    marginVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_10,
  },
  debugText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
  },
  emptyText: {
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_16,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  itemsContainer: {
    flex: 1,
    padding: SPACING.space_16,
  },
  cartItemContainer: {
    marginBottom: SPACING.space_16,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.space_16,
    right: SPACING.space_16,
    padding: SPACING.space_8,
    zIndex: 1,
  },
  footerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.space_16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderTopRightRadius: BORDERRADIUS.radius_20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  totalLabel: {
    fontSize: FONTSIZE.size_18,
    fontWeight: 'bold',
    color: COLORS.primaryBlackHex,
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  totalAmount: {
    fontSize: FONTSIZE.size_24,
    fontWeight: 'bold',
    color: COLORS.primaryOrangeHex,
    fontFamily: FONTFAMILY.poppins_bold,
  },
  orderTypeFooterRow: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  orderTypeButton: {
    flex: 1,
    padding: SPACING.space_12,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
  },
  selectedOrderTypeButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderColor: COLORS.primaryOrangeHex,
  },
  orderTypeButtonText: {
    color: COLORS.primaryOrangeHex,
    fontWeight: 'bold',
    fontFamily: FONTFAMILY.poppins_medium,
  },
  selectedOrderTypeButtonText: {
    color: COLORS.primaryWhiteHex,
  },
  tableNumberInputFooterContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    paddingVertical: SPACING.space_10,
    paddingHorizontal: SPACING.space_12,
  },
  tableNumberInputFooter: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    color: COLORS.primaryBlackHex,
    fontFamily: FONTFAMILY.poppins_medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.space_12,
  },
  button: {
    flex: 1,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_20,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  checkoutButton: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  buttonText: {
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
    color: COLORS.primaryOrangeHex,
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  checkoutButtonText: {
    color: COLORS.primaryWhiteHex,
  },
  continueShoppingButton: {
    marginTop: SPACING.space_20,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    backgroundColor: COLORS.primaryOrangeHex,
  },
  continueShoppingText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  successToast: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: '#4BB543',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    zIndex: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  successToastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalContainer: {
    width: '80%',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: FONTSIZE.size_20,
    fontWeight: 'bold',
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_12,
    fontFamily: FONTFAMILY.poppins_semibold,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_20,
    fontFamily: FONTFAMILY.poppins_medium,
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    width: '100%',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_20,
    paddingVertical: SPACING.space_12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.primaryOrangeHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  modalSignInButton: {
    flex: 1,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_20,
    paddingVertical: SPACING.space_12,
    alignItems: 'center',
    marginLeft: SPACING.space_12,
  },
  modalSignInButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  notesContainer: {
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  notesInput: {
    padding: SPACING.space_12,
    color: COLORS.primaryBlackHex,
    fontFamily: FONTFAMILY.poppins_medium,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});