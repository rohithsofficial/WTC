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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../../src/theme/theme';
import { categoryService, productService } from '../../src/services/firebaseService';
import { Category } from '../../src/types/database';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/store';
import Slider from '@react-native-community/slider';

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

const MenuScreen = () => {
  const router = useRouter();
  const { addToFavorites, removeFromFavorites, isFavorite } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name'>('name');
  const [showAllFeatured, setShowAllFeatured] = useState(false);

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
    const searchLower = searchQuery.trim().toLowerCase();
    
    // Get category name for search
    const categoryName = categories.find(c => c.id === p.categoryId)?.name?.toLowerCase() || '';
    
    // Search across all relevant fields
    const matchesSearch = searchQuery.trim().length === 0 ||
      // Product name
      p.name.toLowerCase().includes(searchLower) ||
      // Category name
      categoryName.includes(searchLower) ||
      // Description
      (p.description && p.description.toLowerCase().includes(searchLower)) ||
      // Special ingredient
      (p.special_ingredient && p.special_ingredient.toLowerCase().includes(searchLower)) ||
      // All ingredients
      (p.ingredients && p.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchLower))) ||
      // Price (convert to string for searching)
      p.prices.some(price => price.toString().includes(searchLower)) ||
      // Rating (if exists)
      (p.average_rating && p.average_rating.toString().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

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
        .slice(0, showAllFeatured ? undefined : 5);
    }
    
    return showAllFeatured ? featuredProducts : featuredProducts.slice(0, 5);
  };

  // Apply filters and sorting
  const getFilteredAndSortedProducts = () => {
    let filtered = [...filteredProducts];

    // Apply price range filter
    filtered = filtered.filter(product => {
      const price = getProductPrice(product);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Apply sorting
   filtered.sort((a, b) => {
  switch (sortBy) {
    case 'price_asc':
      return getProductPrice(a) - getProductPrice(b);
    case 'price_desc':
      return getProductPrice(b) - getProductPrice(a);
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    default:
      return 0;
  }
});


    return filtered;
  };

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
        style={{ marginRight: 6 }}
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
        pathname: '/(app)/products/[id]',
        params: { id: item.id }
      })}
    >
      <Image
        source={{ uri: item.imagelink_square }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => {
          if (isFavorite(item.id)) {
            removeFromFavorites(item.id);
          } else {
            addToFavorites(item);
          }
        }}
      >
        <MaterialIcons
          name={isFavorite(item.id) ? "favorite" : "favorite-border"}
          size={24}
          color={isFavorite(item.id) ? COLORS.primaryOrangeHex : COLORS.primaryGreyHex}
        />
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productCategory} numberOfLines={1}>{categories.find(c => c.id === item.categoryId)?.name || ''}</Text>
        <Text style={styles.productPrice}>₹{getProductPrice(item).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  // --- FEATURED PRODUCT CARD ---
  const renderFeaturedProductCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.featuredProductCard}
      onPress={() => router.push({
        pathname: '/(app)/products/[id]',
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
    
    const filteredAndSortedProducts = getFilteredAndSortedProducts();
    const groupedProducts = filteredAndSortedProducts.reduce((acc, product) => {
      const category = categories.find(c => c.id === product.categoryId);
      const categoryName = category?.name || 'Uncategorized';
      
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
    
    return (
      <ScrollView>
        {/* Featured Products Section - Only show when not searching */}
        {!searchQuery && (
          <View>
            <View style={styles.featuredHeaderRow}>
              <Text style={styles.featuredTitle}>Featured</Text>
              <TouchableOpacity onPress={() => setShowAllFeatured(!showAllFeatured)}>
                <Text style={styles.seeAllText}>
                  {showAllFeatured ? 'Show Less' : 'See All'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredProductsScroll}
            >
              {getFeaturedProducts().map((product) => (
                <View key={product.id}>
                  {renderFeaturedProductCard(product)}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Products by Category */}
        <View style={styles.productsSection}>
          {Object.entries(groupedProducts).map(([categoryName, products]) => (
            <View key={categoryName} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{categoryName}</Text>
              </View>
              <View style={styles.productsGridContainer}>
                {products.map((item) => (
                  <View key={item.id} style={styles.productCardContainer}>
                    {renderProductCard({ item })}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderFilterModal = () => (
    <View style={styles.filterModal}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>Filter & Sort</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <MaterialIcons name="close" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
      </View>

      {/* Sort Options - Moved to top for better visibility */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Sort By</Text>
        <View style={styles.sortContainer}>
          {[
            { value: 'name', label: 'Name (A-Z)', icon: 'sort-by-alpha' },
            { value: 'price_asc', label: 'Price: Low to High', icon: 'arrow-upward' },
            { value: 'price_desc', label: 'Price: High to Low', icon: 'arrow-downward' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortButton,
                sortBy === option.value && styles.sortButtonSelected
              ]}
              onPress={() => setSortBy(option.value as typeof sortBy)}
            >
              <MaterialIcons 
                name={option.icon as any} 
                size={20} 
                color={sortBy === option.value ? COLORS.primaryWhiteHex : COLORS.primaryGreyHex} 
                style={styles.sortButtonIcon}
              />
              <Text style={[
                styles.sortButtonText,
                sortBy === option.value && styles.sortButtonTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Price Range Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>Price Range</Text>
          <Text style={styles.priceRangeText}>₹{priceRange[0]} - ₹{priceRange[1]}</Text>
        </View>
        <View style={styles.priceRangeContainer}>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={1000}
            step={10}
            value={priceRange[1]}
            onValueChange={(value: number) => setPriceRange([priceRange[0], value])}
            minimumTrackTintColor={COLORS.primaryOrangeHex}
            maximumTrackTintColor={COLORS.primaryGreyHex}
            thumbTintColor={COLORS.primaryOrangeHex}
          />
        </View>
      </View>

      {/* Reset and Apply Buttons */}
      <View style={styles.filterActions}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setPriceRange([0, 1000]);
            setSortBy('name');
            setShowFilters(false);
          }}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => setShowFilters(false)}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
    );

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      
      {/* Main Header with Logo and Back */}
      <View style={styles.mainHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Coffee Shop</Text>
          <Text style={styles.headerSubtitle}>Discover our menu</Text>
        </View>
        <TouchableOpacity 
          style={styles.appIconButton}
          onPress={() => router.push('/(app)/HomeScreen')}
        >
          <Image 
            source={require('../../assets/icon.png')}
            style={styles.appIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Category Products Header */}
      <View style={styles.categoryHeaderContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <MaterialIcons 
              name="apps" 
              size={20} 
              color={!selectedCategory ? COLORS.primaryWhiteHex : COLORS.primaryOrangeHex} 
            />
            <Text style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextSelected
            ]}>All</Text>
          </TouchableOpacity>
          {categories.map(renderCategoryChip)}
        </ScrollView>
      </View>
      
      {/* Search and Filter Section */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={22} color={COLORS.primaryOrangeHex} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, category, ingredients..."
            placeholderTextColor={COLORS.primaryGreyHex}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={22} color={COLORS.primaryGreyHex} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialIcons name="filter-list" size={24} color={COLORS.primaryOrangeHex} />
        </TouchableOpacity>
      </View>
      
      {/* Content area */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Filter Modal */}
      {showFilters && (
        <View style={styles.modalOverlay}>
          {renderFilterModal()}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7', // Cream color
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
  categoryHeaderContainer: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  categoryScrollContent: {
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
  categoryChipText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryOrangeHex,
    marginLeft: 6,
  },
  categoryChipTextSelected: {
    color: COLORS.primaryWhiteHex,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E7',
    gap: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  filterButton: {
    padding: 10,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7', // Cream color
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
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productsSection: {
    paddingBottom: 24,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
    position: 'relative',
    zIndex: 1,
  },
  categoryTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 18,
    color: COLORS.primaryBlackHex,
  },
  productsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  productCardContainer: {
    width: '48%',
    marginBottom: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  filterTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 20,
    color: COLORS.primaryBlackHex,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 16,
    color: COLORS.primaryBlackHex,
  },
  priceRangeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryOrangeHex,
  },
  sortContainer: {
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex,
  },
  sortButtonSelected: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderColor: COLORS.primaryOrangeHex,
  },
  sortButtonIcon: {
    marginRight: 8,
  },
  sortButtonText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: 14,
    color: COLORS.primaryGreyHex,
  },
  sortButtonTextSelected: {
    color: COLORS.primaryWhiteHex,
  },
  priceRangeContainer: {
    paddingHorizontal: 8,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryOrangeHex,
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: 16,
    color: COLORS.primaryWhiteHex,
  },
});

export default MenuScreen;