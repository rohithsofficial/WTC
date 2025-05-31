import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, Platform, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../../src/store/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryService } from '../../../src/services/firebaseService';
import { useEffect, useState } from 'react';
import Slider from '@react-native-community/slider';
import { Category } from '../../../src/types/database';

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
  featured?: boolean;
}

const ProductCategoryScreen = () => {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const { allProducts, addToFavorites, removeFromFavorites, isFavorite } = useStore();
  const [categoryName, setCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name'>('name');
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  useEffect(() => {
    const fetchCategoryName = async () => {
      try {
        const categories = await categoryService.getAllCategories();
        const found = categories.find(c => c.id === category);
        setCategoryName(found && 'name' in found ? (found.name as string) : 'Category');
      } catch {
        setCategoryName('Category');
      }
    };
    fetchCategoryName();
  }, [category]);

  // Filter products by this category
  const products = allProducts.filter(p => p.categoryId === category);

  // Search and filter logic
  const filteredProducts = products.filter((p) => {
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch = searchQuery.trim().length === 0 ||
      p.name.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower)) ||
      (p.special_ingredient && p.special_ingredient.toLowerCase().includes(searchLower)) ||
      (p.ingredients && p.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchLower))) ||
      p.prices.some(price => price.toString().includes(searchLower)) ||
      (p.average_rating && p.average_rating.toString().includes(searchLower));
    return matchesSearch;
  });

  // Featured products for this category
  const getProductPrice = (product: Product) => product.prices && product.prices.length > 0 ? product.prices[0] : 0;
  function hasFeatured(product: any): product is Product & { featured: boolean } {
    return typeof product === 'object' && 'featured' in product;
  }
  const featuredProducts = products.filter(product => hasFeatured(product) && !!product.featured);
  const getFeaturedProducts = (): Product[] => {
    return showAllFeatured ? featuredProducts : featuredProducts.slice(0, 5);
  };

  // Apply price filter and sorting
  const getFilteredAndSortedProducts = (): Product[] => {
    let filtered = [...filteredProducts];
    filtered = filtered.filter((product: Product) => {
      const price = getProductPrice(product);
      return price >= priceRange[0] && price <= priceRange[1];
    });
    filtered.sort((a: Product, b: Product) => {
      switch (sortBy) {
        case 'price_asc':
          return getProductPrice(a) - getProductPrice(b);
        case 'price_desc':
          return getProductPrice(b) - getProductPrice(a);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return filtered;
  };

  // --- Featured Product Card ---
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

  // --- Filter Modal ---
  const renderFilterModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.filterModal}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <MaterialIcons name="close" size={24} color={COLORS.primaryBlackHex} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: '70%' }}>
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
                onValueChange={(value) => setPriceRange([priceRange[0], value])}
                minimumTrackTintColor={COLORS.primaryOrangeHex}
                maximumTrackTintColor={COLORS.primaryGreyHex}
                thumbTintColor={COLORS.primaryOrangeHex}
              />
            </View>
          </View>
        </ScrollView>
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
    </View>
  );

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      {/* Main Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <Text style={styles.headerSubtitle}>Discover our selection</Text>
        </View>
        <TouchableOpacity 
          style={styles.appIconButton}
          onPress={() => router.push('/(app)/HomeScreen')}
        >
          <Image 
            source={require('../../../assets/icon.png')}
            style={styles.appIcon}
          />
        </TouchableOpacity>
      </View>
      {/* Search and Filter Section */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={22} color={COLORS.primaryOrangeHex} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ingredients..."
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
      {/* Category Products Grid with Featured as ListHeaderComponent */}
      <View style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
        {getFilteredAndSortedProducts().length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="category" size={64} color={COLORS.primaryGreyHex} />
          <Text style={styles.emptyText}>No products found</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/MenuScreen')}
          >
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
            data={getFilteredAndSortedProducts()}
          numColumns={2}
            ListHeaderComponent={
              featuredProducts.length > 0 && !searchQuery ? (
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
              ) : null
            }
          renderItem={({ item }) => (
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
                      addToFavorites(item as any);
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
                <Text style={styles.productPrice}>₹{item.prices[0].toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.productsGrid}
            style={{ flex: 1 }}
        />
        )}
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
    backgroundColor: '#FFF8E7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_24,
    paddingTop: SPACING.space_12,
    paddingBottom: SPACING.space_8,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: SPACING.space_16,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
  },
  headerSubtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
  appIconButton: {
    padding: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
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
  productsGrid: {
    padding: SPACING.space_16,
    paddingBottom: 32,
  },
  productCard: {
    flex: 1,
    margin: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderTopRightRadius: BORDERRADIUS.radius_20,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.space_8,
    right: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: 20,
    padding: SPACING.space_4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productInfo: {
    padding: SPACING.space_16,
  },
  productName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  productPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_24,
  },
  emptyText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_16,
  },
  browseButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    marginTop: SPACING.space_24,
  },
  browseButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.space_16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  filterButton: {
    padding: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.space_16,
  },
  featuredTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
  },
  seeAllText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_8,
  },
  featuredProductsScroll: {
    padding: SPACING.space_16,
  },
  featuredProductCard: {
    width: 200,
    marginRight: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featuredProductImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderTopRightRadius: BORDERRADIUS.radius_20,
  },
  featuredProductBadge: {
    position: 'absolute',
    top: SPACING.space_8,
    right: SPACING.space_8,
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: 10,
    padding: SPACING.space_4,
  },
  featuredProductBadgeText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  featuredProductInfo: {
    padding: SPACING.space_16,
  },
  featuredProductName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  featuredProductPrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  filterModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primaryWhiteHex,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.space_16,
  },
  filterTitle: {
    fontFamily: FONTFAMILY.poppins_bold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
  },
  filterSection: {
    padding: SPACING.space_16,
  },
  filterSectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    padding: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_10,
    marginRight: SPACING.space_8,
  },
  sortButtonSelected: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  sortButtonIcon: {
    marginRight: SPACING.space_8,
  },
  sortButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryGreyHex,
  },
  sortButtonTextSelected: {
    color: COLORS.primaryWhiteHex,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.space_8,
  },
  priceRangeText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  priceRangeContainer: {
    padding: SPACING.space_8,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.space_16,
  },
  resetButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
  },
  resetButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  applyButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_10,
  },
  applyButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
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
});

export default ProductCategoryScreen; 