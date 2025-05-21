import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../../src/theme/theme';
import { categoryService, productService } from '../../src/services/firebaseService';
import { Category } from '../../src/types/database';

// Enhanced Product type with featured flag
interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  imagelink_square: string;
  imagelink_portrait?: string;
  ingredients?: string[];
  special_ingredient?: string;
  prices: number[];
  average_rating?: number;
  ratings_count?: number;
  favourite?: boolean;
  featured?: boolean; // New featured flag property
}
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const MenuScreen = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategoriesAndProducts();
  }, []);

  const loadCategoriesAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load categories and products in parallel
      const [categoriesData, allProducts] = await Promise.all([
        categoryService.getAllCategories(),
        productService.getAllProducts()
      ]);
      
      setCategories(categoriesData);
      setProducts(allProducts);
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (product: Product) => {
    if (product.prices && product.prices.length > 0) {
      return product.prices[0];
    }
    return 0;
  };

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = searchQuery.trim().length === 0 ||
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (p.special_ingredient && p.special_ingredient.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // --- CATEGORY CHIP RENDER ---
  const renderCategoryChip = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.categoryChipSelected
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <MaterialIcons
        name={category.icon ? category.icon : 'local-cafe'}
        size={20}
        color={selectedCategory === category.id ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex}
        style={styles.categoryChipIcon}
      />
      <Text style={[
        styles.categoryChipText,
        selectedCategory === category.id && styles.categoryChipTextSelected
      ]}>{category.name}</Text>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/(app)/product-detail/[id]',
        params: { id: item.id }
      })}
    >
      <Image
        source={{ uri: item.imagelink_square }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productCategory} numberOfLines={1}>{categories.find(c => c.id === item.categoryId)?.name || ''}</Text>
        <Text style={styles.productPrice}>₹{getProductPrice(item).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Get featured products using the featured flag
  const getFeaturedProducts = () => {
    // First try to get products marked as featured
    const featuredProducts = products.filter(product => product.featured === true);
    
    // If no featured products are explicitly marked, fallback to top 5 by price
    if (featuredProducts.length === 0) {
      return products
        .slice()
        .sort((a, b) => {
          const priceA = getProductPrice(a);
          const priceB = getProductPrice(b);
          return priceB - priceA;
        })
        .slice(0, 5);
    }
    
    return featuredProducts;
  };

  // --- FEATURED PRODUCT CARD ---
  const renderFeaturedProductCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.featuredProductCard}
      onPress={() => router.push({
        pathname: '/(app)/product-detail/[id]',
        params: { id: product.id }
      })}
    >
      <Image
        source={{ uri: product.imagelink_square }}
        style={styles.featuredProductImage}
        resizeMode="cover"
      />
      <View style={styles.featuredProductBadge}>
        <Text style={styles.featuredProductBadgeText}>Featured</Text>
      </View>
      <View style={styles.featuredProductInfo}>
        <Text style={styles.featuredProductName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.featuredProductPrice}>₹{getProductPrice(product).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  // --- STICKY HEADER ---
  const renderHeader = () => (
    <View style={styles.headerBackground}>
      {/* Search Bar (TextInput) */}
      <View style={styles.searchBarContainer}>
        <MaterialIcons name="search" size={22} color={COLORS.primaryOrangeHex} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find your food here..."
          placeholderTextColor={COLORS.primaryGreyHex}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryChipsScroll}
        style={{ marginBottom: 12 }}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipSelected
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <MaterialIcons name="apps" size={20} color={!selectedCategory ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} />
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextSelected
          ]}>All</Text>
        </TouchableOpacity>
        {categories.map(renderCategoryChip)}
      </ScrollView>
      
      {/* Featured Products Section */}
      {!loading && products.length > 0 && (
        <View>
          <View style={styles.featuredHeaderRow}>
            <Text style={styles.featuredTitle}>Featured</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredProductsScroll}
          >
            {getFeaturedProducts().map(renderFeaturedProductCard)}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadCategoriesAndProducts}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filteredProducts.length === 0) {
      return (
        <View style={styles.noProductsContainer}>
          <MaterialIcons name="search-off" size={48} color={COLORS.primaryGreyHex} />
          <Text style={styles.noProductsText}>No products found</Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchButtonText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return (
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={renderProductCard}
        contentContainerStyle={styles.productsGrid}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      {/* Header (title/subtitle only) */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Let's eat</Text>
          <Text style={styles.headerSubtitle}>Nutritious food.</Text>
        </View>
      </View>
      
      {/* Fixed search and category section */}
      {renderHeader()}
      
      {/* Content area */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F4FF', // Unique light blue background color
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#F0F4FF', // Match the main background
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
  headerBackground: {
    backgroundColor: '#F0F4FF', // Match the main background
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    marginHorizontal: 24,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: 16,
    color: COLORS.primaryBlackHex,
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F0F4FF', // Match the main background
  },
  categoryChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  categoryChipIcon: {
    marginRight: 6,
  },
  categoryChipText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryOrangeHex,
  },
  categoryChipTextSelected: {
    color: COLORS.primaryWhiteHex,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  featuredTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 18,
    color: COLORS.primaryBlackHex,
  },
  seeAllText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryOrangeHex,
  },
  featuredProductsScroll: {
    paddingLeft: 24,
    paddingRight: 12,
    paddingBottom: 16,
  },
  featuredProductCard: {
    width: 180,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 3,
  },
  featuredProductImage: {
    width: '100%',
    height: 120,
  },
  featuredProductBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredProductBadgeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 10,
    color: COLORS.primaryWhiteHex,
  },
  featuredProductInfo: {
    padding: 12,
  },
  featuredProductName: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryBlackHex,
    marginBottom: 4,
  },
  featuredProductPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryOrangeHex,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 18,
    color: COLORS.primaryBlackHex,
    marginLeft: 24,
    marginBottom: 12,
  },
  recommendedScroll: {
    paddingLeft: 24,
    gap: 12,
  },
  productCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 20,
    margin: 8,
    flex: 1,
    minWidth: 160,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryBlackHex,
    marginBottom: 2,
  },
  productCategory: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: 12,
    color: COLORS.primaryGreyHex,
    marginBottom: 4,
  },
  productPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryOrangeHex,
  },
  productsGrid: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 16,
    color: COLORS.primaryRedHex,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 14,
    color: COLORS.primaryWhiteHex,
  },
  noProductsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  noProductsText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 18,
    color: COLORS.primaryGreyHex,
    marginTop: 12,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  clearSearchButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryWhiteHex,
  },
});

export default MenuScreen;