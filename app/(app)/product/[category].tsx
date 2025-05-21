import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  ToastAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../../../src/theme/theme';
import { Product } from '../../../src/types/interfaces';
import { fetchProductsByCategory, fetchProductsByType } from '../../../src/firebase/product-service';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.space_30) / 2;

const ProductCategoryScreen = () => {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    console.log('Category param:', category);
    loadCategoryProducts();
  }, [category]);

  const isMenuType = (category: string) => {
    return ['breakfast', 'lunch', 'dinner', 'desserts'].includes(category.toLowerCase());
  };

  const loadCategoryProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let categoryProducts: Product[] = [];
      
      // First try to fetch by category ID
      categoryProducts = await fetchProductsByCategory(category as string);
      
      // If no products found and it's a menu type, try fetching by type
      if (categoryProducts.length === 0 && isMenuType(category as string)) {
        categoryProducts = await fetchProductsByType(category as string);
      }
      
      setProducts(categoryProducts);
      
      // Set category name from the first product's type if available
      if (categoryProducts.length > 0 && categoryProducts[0].type) {
        setCategoryName(categoryProducts[0].type);
      } else {
        // Fallback to formatted category ID
        const formattedName = (category as string)
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        setCategoryName(formattedName);
      }
      
      console.log('Loaded products for category:', category, categoryProducts);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading category products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductPress = (productId: string) => {
    console.log('Navigating to product from category:', productId);
    try {
      router.push(`/(app)/product-detail/${productId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      ToastAndroid.show('Error navigating to product', ToastAndroid.SHORT);
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => handleProductPress(item.id)}
      style={styles.productCard}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[COLORS.primaryGreyHex, COLORS.primaryBlackHex]}
        style={styles.cardGradient}
      >
        <Image
          source={{ uri: item.imagelink_square }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={16} color={COLORS.primaryOrangeHex} />
          <Text style={styles.ratingText}>{item.average_rating}</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productIngredient} numberOfLines={1}>{item.special_ingredient}</Text>
          <Text style={styles.priceText}>₹{item.prices[0]}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadCategoryProducts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryWhiteHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
        <View style={styles.headerRight} />
      </View>
      
      {products.length > 0 ? (
        <FlatList
          data={products}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productList}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>No products found in this category</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryBlackHex,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryGreyHex,
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryWhiteHex,
  },
  headerRight: {
    width: 40,
  },
  productList: {
    padding: SPACING.space_15,
  },
  productCard: {
    width: CARD_WIDTH,
    margin: SPACING.space_8,
  },
  cardGradient: {
    borderRadius: SPACING.space_15,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH,
    borderTopLeftRadius: SPACING.space_15,
    borderTopRightRadius: SPACING.space_15,
  },
  ratingContainer: {
    position: 'absolute',
    top: SPACING.space_8,
    right: SPACING.space_8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackRGBA,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: SPACING.space_10,
  },
  ratingText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_4,
  },
  productInfo: {
    padding: SPACING.space_12,
  },
  productName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginBottom: SPACING.space_4,
  },
  productIngredient: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryLightGreyHex,
    marginBottom: SPACING.space_8,
  },
  priceText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  loadingText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlackHex,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_20,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_10,
    borderRadius: SPACING.space_10,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_20,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: SPACING.space_20,
  },
  emptyText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryLightGreyHex,
    textAlign: 'center',
  },
});

export default ProductCategoryScreen; 