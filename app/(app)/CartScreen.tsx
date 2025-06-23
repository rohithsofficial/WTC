import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Animated,
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const { state, dispatch } = useCart();
  const [orderType, setOrderType] = useState('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  const [baristaNotes, setBaristaNotes] = useState('');
  
  // Animation values
  const errorOpacity = new Animated.Value(0);
  const modalScale = new Animated.Value(0.8);

  useEffect(() => {
    if (showErrorToast) {
      Animated.sequence([
        Animated.timing(errorOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(errorOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowErrorToast(false));
    }
  }, [showErrorToast]);

  useEffect(() => {
    if (showSignInModal) {
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      modalScale.setValue(0.8);
    }
  }, [showSignInModal]);

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorToast(true);
  };

  const handleIncrementQuantity = async (id, size) => {
    try {
      dispatch({ type: 'INCREMENT_QUANTITY', payload: { id, size } });
    } catch (error) {
      console.error('Error incrementing quantity:', error);
      showError('Failed to update quantity. Please try again.');
    }
  };

  const handleDecrementQuantity = async (id, size) => {
    try {
      dispatch({ type: 'DECREMENT_QUANTITY', payload: { id, size } });
    } catch (error) {
      console.error('Error decrementing quantity:', error);
      showError('Failed to update quantity. Please try again.');
    }
  };

  const handleRemoveItem = async (id, size) => {
    try {
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              try {
                dispatch({ type: 'REMOVE_FROM_CART', payload: { id, size } });
              } catch (error) {
                console.error('Error removing item:', error);
                showError('Failed to remove item. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error showing remove confirmation:', error);
      showError('An unexpected error occurred.');
    }
  };

  const handleClearCart = async () => {
    try {
      Alert.alert(
        'Clear Cart',
        'Are you sure you want to remove all items from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: () => {
              try {
                dispatch({ type: 'CLEAR_CART' });
              } catch (error) {
                console.error('Error clearing cart:', error);
                showError('Failed to clear cart. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error showing clear confirmation:', error);
      showError('An unexpected error occurred.');
    }
  };

  const validateCheckoutData = () => {
    if (!state.items || state.items.length === 0) {
      throw new Error('Your cart is empty. Please add items before checkout.');
    }

    if (orderType === 'dinein' && !tableNumber.trim()) {
      throw new Error('Please enter a table number for dine-in orders.');
    }

    if (orderType === 'dinein' && isNaN(parseInt(tableNumber))) {
      throw new Error('Please enter a valid table number.');
    }

    if (!state.total || state.total <= 0) {
      throw new Error('Invalid order total. Please refresh and try again.');
    }

    return true;
  };

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      // Check authentication first
      if (!auth.currentUser) {
        setShowSignInModal(true);
        return;
      }

      // Validate checkout data
      validateCheckoutData();

      // Create checkout data with proper error handling
      const checkoutData = {
        items: state.items.map(item => {
          if (!item.id || !item.name || !item.price) {
            throw new Error('Invalid item data found. Please refresh your cart.');
          }
          return {
            id: item.id,
            name: item.name,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            size: item.size || 'medium',
            type: item.type || 'coffee'
          };
        }),
        total: parseFloat(state.total) || 0,
        orderType,
        tableNumber: orderType === 'dinein' ? tableNumber.trim() : '',
        baristaNotes: baristaNotes.trim(),
        timestamp: new Date().toISOString()
      };

      // Navigate to payment screen
      router.push({
        pathname: '/(app)/PaymentScreen',
        params: {
          state: JSON.stringify(checkoutData),
          amount: checkoutData.total.toString(),
          userId: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || auth.currentUser.email || 'Guest'
        }
      });

    } catch (error) {
      console.error('Checkout Error:', error);
      showError(error.message || 'Something went wrong during checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInFromModal = async () => {
    try {
      setShowSignInModal(false);
      router.push('/(auth)/login');
    } catch (error) {
      console.error('Navigation error:', error);
      showError('Failed to navigate to sign in. Please try again.');
    }
  };

  const handleBackNavigation = async () => {
    try {
      router.back();
    } catch (error) {
      console.error('Navigation error:', error);
      router.push('/(app)/HomeScreen');
    }
  };

  const handleHomeNavigation = async () => {
    try {
      router.push('/(app)/HomeScreen');
    } catch (error) {
      console.error('Navigation error:', error);
      showError('Failed to navigate to home. Please try again.');
    }
  };

  const handleContinueShopping = async () => {
    try {
      router.push('/MenuScreen');
    } catch (error) {
      console.error('Navigation error:', error);
      showError('Failed to navigate to menu. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Cart', headerShown: false }} />
      <View style={styles.screenContainer}>
        <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
        
        {/* Error Toast */}
        {showErrorToast && (
          <Animated.View style={[styles.errorToast, { opacity: errorOpacity }]}>
            <FontAwesome name="exclamation-triangle" size={16} color="#fff" />
            <Text style={styles.errorToastText}>{errorMessage}</Text>
          </Animated.View>
        )}

        {/* Header */}
        <View style={styles.mainHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackNavigation}>
            <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Cart</Text>
            <Text style={styles.headerSubtitle}>Review your order</Text>
          </View>
          <TouchableOpacity style={styles.appIconButton} onPress={handleHomeNavigation}>
            <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {!state.items || state.items.length === 0 ? (
            <View style={styles.emptyCart}>
              <FontAwesome name="shopping-cart" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <Text style={styles.emptySubtext}>Add some delicious items to get started</Text>
              <TouchableOpacity style={styles.continueShoppingButton} onPress={handleContinueShopping}>
                <Text style={styles.continueShoppingText}>Browse Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView 
                style={styles.itemsContainer} 
                contentContainerStyle={{ paddingBottom: 250 }}
                showsVerticalScrollIndicator={false}
              >
                {state.items.map((item, index) => {
                  try {
                    return (
                      <View key={`${item.id}-${item.size}-${index}`} style={styles.cartItemContainer}>
                        <CartItem
                          id={item.id}
                          name={item.name || 'Unknown Item'}
                          imagelink_square={{ uri: item.imagelink_square }}
                          special_ingredient={item.special_ingredient || 'No special ingredients'}
                          roasted={item.roasted || 'Medium Roast'}
                          prices={[{ 
                            size: item.size || 'medium', 
                            price: item.price || 0, 
                            quantity: item.quantity || 1 
                          }]}
                          type={item.type || 'coffee'}
                          incrementCartItemQuantityHandler={() => handleIncrementQuantity(item.id, item.size)}
                          decrementCartItemQuantityHandler={() => handleDecrementQuantity(item.id, item.size)}
                          onImagePress={() => {
                            try {
                              router.push({ 
                                pathname: '/(app)/products/[id]', 
                                params: { id: item.id } 
                              });
                            } catch (error) {
                              console.error('Navigation error:', error);
                              showError('Failed to view item details.');
                            }
                          }}
                        />
                        <TouchableOpacity 
                          style={styles.removeButton} 
                          onPress={() => handleRemoveItem(item.id, item.size)}
                        >
                          <FontAwesome name="trash" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    );
                  } catch (error) {
                    console.error('Error rendering cart item:', error);
                    return null;
                  }
                })}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footerAbsolute}>
                {/* Total */}
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₹{(state.total || 0).toFixed(2)}</Text>
                </View>

                {/* Notes */}
                <View style={styles.notesContainer}>
                  <TextInput
                    style={styles.notesInput}
                    value={baristaNotes}
                    onChangeText={setBaristaNotes}
                    placeholder="Add a note for the barista (optional)"
                    placeholderTextColor={COLORS.primaryGreyHex}
                    multiline
                    numberOfLines={2}
                    maxLength={200}
                  />
                </View>

                {/* Order Type */}
                <View style={styles.orderTypeFooterRow}>
                  <TouchableOpacity
                    style={[styles.orderTypeButton, orderType === 'dinein' && styles.selectedOrderTypeButton]}
                    onPress={() => setOrderType('dinein')}
                  >
                    <FontAwesome 
                      name="cutlery" 
                      size={16} 
                      color={orderType === 'dinein' ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} 
                    />
                    <Text style={[styles.orderTypeButtonText, orderType === 'dinein' && styles.selectedOrderTypeButtonText]}>
                      Dine In
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.orderTypeButton, orderType === 'takeaway' && styles.selectedOrderTypeButton]}
                    onPress={() => setOrderType('takeaway')}
                  >
                    <FontAwesome 
                      name="shopping-bag" 
                      size={16} 
                      color={orderType === 'takeaway' ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} 
                    />
                    <Text style={[styles.orderTypeButtonText, orderType === 'takeaway' && styles.selectedOrderTypeButtonText]}>
                      Takeaway
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Table Number Input */}
                {orderType === 'dinein' && (
                  <View style={styles.tableNumberContainer}>
                    <FontAwesome name="table" size={16} color={COLORS.primaryOrangeHex} />
                    <TextInput
                      style={styles.tableNumberInput}
                      value={tableNumber}
                      onChangeText={setTableNumber}
                      keyboardType="numeric"
                      placeholder="Enter table number"
                      placeholderTextColor={COLORS.primaryGreyHex}
                      maxLength={3}
                    />
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.button, styles.clearButton]} 
                    onPress={handleClearCart}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Clear Cart</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.checkoutButton, isLoading && styles.disabledButton]} 
                    onPress={handleCheckout}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.primaryWhiteHex} />
                    ) : (
                      <>
                        <FontAwesome name="credit-card" size={16} color={COLORS.primaryWhiteHex} />
                        <Text style={[styles.buttonText, styles.checkoutButtonText]}>
                          Proceed to Payment
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Enhanced Sign In Modal */}
        <Modal 
          visible={showSignInModal} 
          transparent 
          animationType="fade" 
          onRequestClose={() => setShowSignInModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContainer, { transform: [{ scale: modalScale }] }]}>
              <View style={styles.modalIconContainer}>
                <FontAwesome name="lock" size={32} color={COLORS.primaryOrangeHex} />
              </View>
              
              <Text style={styles.modalTitle}>Sign In Required</Text>
              <Text style={styles.modalMessage}>
                To complete your order and enjoy our services, please sign in to your account.
              </Text>
              
              <View style={styles.modalFeatures}>
                <View style={styles.modalFeatureItem}>
                  <FontAwesome name="check-circle" size={16} color="#4BB543" />
                  <Text style={styles.modalFeatureText}>Save your favorite orders</Text>
                </View>
                <View style={styles.modalFeatureItem}>
                  <FontAwesome name="check-circle" size={16} color="#4BB543" />
                  <Text style={styles.modalFeatureText}>Track order history</Text>
                </View>
                <View style={styles.modalFeatureItem}>
                  <FontAwesome name="check-circle" size={16} color="#4BB543" />
                  <Text style={styles.modalFeatureText}>Faster checkout next time</Text>
                </View>
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => setShowSignInModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalSignInButton}
                  onPress={handleSignInFromModal}
                >
                  <FontAwesome name="sign-in" size={16} color={COLORS.primaryWhiteHex} />
                  <Text style={styles.modalSignInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
    padding: 8,
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
  errorToast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  errorToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_16,
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  emptySubtext: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_8,
    fontFamily: FONTFAMILY.poppins_regular,
    textAlign: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
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
    paddingVertical: SPACING.space_8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  notesContainer: {
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  notesInput: {
    padding: SPACING.space_12,
    color: COLORS.primaryBlackHex,
    fontFamily: FONTFAMILY.poppins_regular,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  orderTypeFooterRow: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    marginBottom: SPACING.space_16,
  },
  orderTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.space_12,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  selectedOrderTypeButton: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  orderTypeButtonText: {
    color: COLORS.primaryOrangeHex,
    fontWeight: '600',
    fontFamily: FONTFAMILY.poppins_medium,
  },
  selectedOrderTypeButtonText: {
    color: COLORS.primaryWhiteHex,
  },
  tableNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.space_16,
    padding: SPACING.space_12,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_10,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  tableNumberInput: {
    flex: 1,
    color: COLORS.primaryBlackHex,
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.space_12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
  },
  clearButton: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  checkoutButton: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
    color: COLORS.primaryOrangeHex,
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  checkoutButtonText: {
    color: COLORS.primaryWhiteHex,
  },
  continueShoppingButton: {
    marginTop: SPACING.space_20,
    paddingHorizontal: SPACING.space_32,
    paddingVertical: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_25,
    backgroundColor: COLORS.primaryOrangeHex,
    shadowColor: COLORS.primaryOrangeHex,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueShoppingText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: 'bold',
    fontFamily: FONTFAMILY.poppins_semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_25,
    padding: SPACING.space_24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  modalTitle: {
    fontSize: FONTSIZE.size_20,
    fontWeight: 'bold',
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_12,
    fontFamily: FONTFAMILY.poppins_bold,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_20,
    fontFamily: FONTFAMILY.poppins_regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFeatures: {
    width: '100%',
    marginBottom: SPACING.space_20,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_8,
  },
  modalFeatureText: {
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
    fontFamily: FONTFAMILY.poppins_regular,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: BORDERRADIUS.radius_15,
    paddingVertical: SPACING.space_12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.primaryGreyHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '600',
    fontFamily: FONTFAMILY.poppins_medium,
  },
  modalSignInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_15,
    paddingVertical: SPACING.space_12,
  },
  modalSignInButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '600',
    fontFamily: FONTFAMILY.poppins_medium,
  },
});