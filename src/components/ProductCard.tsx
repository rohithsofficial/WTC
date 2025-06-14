import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../theme/theme';
import { getImageSource } from '../utils/imageUtils';

interface ProductCardProps {
  product: {
    name: string;
    price: number;
    imagelink_square: string;
    special_ingredient: string;
    type: string;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <View style={styles.container}>
      <Image
        source={getImageSource(product.imagelink_square)}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.ingredient} numberOfLines={1}>
          {product.special_ingredient}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          <View style={[styles.badge, { backgroundColor: getBadgeColor(product.type) }]}>
            <Text style={styles.badgeText}>{product.type}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const getBadgeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'coffee':
      return COLORS.primaryOrangeHex;
    case 'tea':
      return COLORS.primaryGreenHex;
    case 'smoothie':
      return COLORS.primaryPurpleHex;
    default:
      return COLORS.primaryGreyHex;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryDarkGreyHex,
    borderRadius: SPACING.space_15,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  infoContainer: {
    padding: SPACING.space_12,
  },
  name: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  ingredient: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.secondaryLightGreyHex,
    marginBottom: SPACING.space_8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryOrangeHex,
  },
  badge: {
    paddingHorizontal: SPACING.space_10,
    paddingVertical: SPACING.space_4,
    borderRadius: SPACING.space_10,
  },
  badgeText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_10,
    color: COLORS.primaryWhiteHex,
  },
});

export default ProductCard; 