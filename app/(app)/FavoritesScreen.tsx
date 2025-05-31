import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../src/store/store';

const { width } = Dimensions.get('window');

// Product interface for better type safety
interface Product {
  id: string;
  name: string;
  description?: string;
  imagelink_square: string;
  prices: Array<{ 
    size: string;
    price: string;
    currency: string;
  }>;
  average_rating?: number;
  ratings_count?: number;
  roasted?: string;
  ingredients?: string;
  special_ingredient?: string;
  type?: string;
  index?: number;
}

const FavoritesScreen = () => {
  const router = useRouter();
  const { favorites, removeFromFavorites, isLoading, syncFavorites, fetchData } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchData();
        await syncFavorites();
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    loadData();
  }, []);

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFromFavorites(productId);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleProductPress = (item: Product) => {
    // Navigate to product details with proper params
    router.push({
      pathname: `/products/[id]`,
      params: { 
        id: item.id,
        index: item.index || 0,
        type: item.type || 'Coffee'
      }
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <MaterialIcons key={i} name="star" size={16} color={COLORS.primaryOrangeHex} />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <MaterialIcons key="half" name="star-half" size={16} color={COLORS.primaryOrangeHex} />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialIcons key={`empty-${i}`} name="star-border" size={16} color={COLORS.primaryGreyHex} />
      );
    }

    return stars;
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.imagelink_square }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleRemoveFavorite(item.id)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="favorite" size={22} color={COLORS.primaryRedHex} />
        </TouchableOpacity>
      </View>

      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.special_ingredient && (
          <Text style={styles.specialIngredient} numberOfLines={1}>
            With {item.special_ingredient}
          </Text>
        )}

        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.average_rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(item.average_rating)}
            </View>
            <Text style={styles.ratingText}>
              {item.average_rating.toFixed(1)}
            </Text>
            {item.ratings_count && (
              <Text style={styles.ratingsCount}>
                ({item.ratings_count})
              </Text>
            )}
          </View>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.currency}>
            {item.prices[0].currency}
          </Text>
          <Text style={styles.price}>
            {item.prices[0].price}
          </Text>
          {item.prices.length > 1 && (
            <Text style={styles.priceNote}>
              +{item.prices.length - 1} more
            </Text>
          )}
        </View>

        {item.roasted && (
          <View style={styles.roastedContainer}>
            <MaterialIcons name="local-fire-department" size={14} color={COLORS.primaryOrangeHex} />
            <Text style={styles.roastedText}>{item.roasted}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={styles.favoriteCount}>
          <Text style={styles.favoriteCountText}>{favorites.length}</Text>
        </View>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={80} color={COLORS.primaryGreyHex} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Start exploring and add your favorite products
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="explore" size={20} color={COLORS.primaryWhiteHex} />
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_15,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLightGreyHex,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_8,
    backgroundColor: COLORS.primaryLightGreyHex,
  },
  headerTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.space_16,
  },
  favoriteCount: {
    backgroundColor: COLORS.primaryOrangeHex,
    borderRadius: BORDERRADIUS.radius_15,
    minWidth: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_8,
  },
  favoriteCountText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_30,
  },
  loadingText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_30,
  },
  emptyTitle: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginTop: SPACING.space_20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    marginTop: SPACING.space_8,
    textAlign: 'center',
    lineHeight: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_25,
    marginTop: SPACING.space_30,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  browseButtonText: {
    fontSize: FONTSIZE.size_16,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryWhiteHex,
    marginLeft: SPACING.space_8,
  },
  listContainer: {
    paddingHorizontal: SPACING.space_20,
    paddingTop: SPACING.space_20,
    paddingBottom: SPACING.space_30,
  },
  separator: {
    height: SPACING.space_16,
  },
  productCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: COLORS.primaryLightGreyHex,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: SPACING.space_16,
  },
  productImage: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: BORDERRADIUS.radius_15,
    backgroundColor: COLORS.primaryLightGreyHex,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.space_8,
    right: SPACING.space_8,
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_8,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    lineHeight: 24,
    marginBottom: SPACING.space_4,
  },
  specialIngredient: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryOrangeHex,
    marginBottom: SPACING.space_8,
  },
  productDescription: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    lineHeight: 18,
    marginBottom: SPACING.space_12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.space_12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: SPACING.space_8,
  },
  ratingText: {
    fontSize: FONTSIZE.size_14,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryBlackHex,
    marginRight: SPACING.space_4,
  },
  ratingsCount: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.space_8,
  },
  currency: {
    fontSize: FONTSIZE.size_18,
    fontFamily: FONTFAMILY.poppins_semibold,
    color: COLORS.primaryOrangeHex,
  },
  price: {
    fontSize: FONTSIZE.size_20,
    fontFamily: FONTFAMILY.poppins_bold,
    color: COLORS.primaryOrangeHex,
    marginLeft: SPACING.space_4,
  },
  priceNote: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_regular,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
  },
  roastedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLightGreyHex,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
    alignSelf: 'flex-start',
  },
  roastedText: {
    fontSize: FONTSIZE.size_12,
    fontFamily: FONTFAMILY.poppins_medium,
    color: COLORS.primaryBlackHex,
    marginLeft: SPACING.space_4,
  },
});

export default FavoritesScreen;