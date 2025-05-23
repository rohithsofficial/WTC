import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageSourcePropType,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BORDERRADIUS,
  COLORS,
  FONTFAMILY,
  FONTSIZE,
  SPACING,
} from '../theme/theme';

interface CartItemProps {
  id: string;
  name: string;
  imagelink_square: ImageSourcePropType;
  special_ingredient: string;
  roasted: string;
  prices: any;
  type?: string;
  incrementCartItemQuantityHandler: any;
  decrementCartItemQuantityHandler: any;
  onImagePress?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({
  id,
  name,
  imagelink_square,
  special_ingredient,
  roasted,
  prices,
  type,
  incrementCartItemQuantityHandler,
  decrementCartItemQuantityHandler,
  onImagePress,
}) => {
  const [inputQuantity, setInputQuantity] = useState(prices[0].quantity.toString());
  const handleQuantityChange = (text: string) => {
    // Only allow numbers and prevent empty string
    const num = text.replace(/[^0-9]/g, '');
    if (num && parseInt(num) > 0) {
      setInputQuantity(num);
      // Optionally, call increment/decrement handler to update cart state
      // (You may want to add a prop for direct set quantity)
    } else if (num === '') {
      setInputQuantity('1');
    }
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.8} style={styles.imageContainer}>
        <Image source={imagelink_square} style={styles.cardImage} />
                </TouchableOpacity>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.cardSubtitle}>{special_ingredient}</Text>
        <View style={styles.cardDetailsRow}>
          <View style={styles.sizeBox}>
            <Text style={styles.sizeText}>{prices[0].size}</Text>
          </View>
          <Text style={styles.priceText}>{prices[0].currency} {prices[0].price}</Text>
            </View>
        <View style={styles.quantityRow}>
              <TouchableOpacity
            style={styles.quantityButton}
                onPress={() => {
              if (prices[0].quantity > 1) {
                  decrementCartItemQuantityHandler(id, prices[0].size);
              }
            }}
          >
            <MaterialIcons name="remove" color={COLORS.primaryOrangeHex} size={FONTSIZE.size_24} />
              </TouchableOpacity>
          <Text style={styles.quantityText}>{prices[0].quantity}</Text>
              <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => incrementCartItemQuantityHandler(id, prices[0].size)}
          >
            <MaterialIcons name="add" color={COLORS.primaryOrangeHex} size={FONTSIZE.size_24} />
              </TouchableOpacity>
            </View>
          </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginBottom: SPACING.space_16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    padding: SPACING.space_12,
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '50%',
  },
  cardImage: {
    width: 110,
    height: 110,
    borderRadius: 32,
  },
  cardInfo: {
    flex: 1,
    maxWidth: '50%',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
  },
  cardSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.secondaryLightGreyHex,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.space_8,
  },
  sizeBox: {
    backgroundColor: COLORS.primaryOrangeHex,
    height: 40,
    minWidth: 80,
    borderRadius: BORDERRADIUS.radius_10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeText: {
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
  },
  priceText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryOrangeHex,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: COLORS.primaryWhiteHex,
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  quantityText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginHorizontal: 8,
  },
});

export default CartItem;
