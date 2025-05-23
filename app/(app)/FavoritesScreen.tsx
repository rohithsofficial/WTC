import React from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../src/store/store';

const FavoritesScreen = () => {
  const router = useRouter();
  const { favorites, removeFromFavorites } = useStore();

  const renderFavoriteItem = ({ item }) => (
    <TouchableOpacity
      style={styles.favoriteCard}
      onPress={() => router.push({
        pathname: '/(app)/product-detail/[id]',
        params: { id: item.id }
      })}
    >
      <Image
        source={{ uri: item.imagelink_square }}
        style={styles.favoriteImage}
        resizeMode="cover"
      />
      <View style={styles.favoriteInfo}>
        <Text style={styles.favoriteName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.favoritePrice}>₹{item.prices[0].toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromFavorites(item.id)}
        >
          <MaterialIcons name="favorite" size={24} color={COLORS.primaryOrangeHex} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar backgroundColor={COLORS.primaryWhiteHex} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={64} color={COLORS.primaryGreyHex} />
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Add items to your favorites to see them here
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/MenuScreen')}
          >
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.favoritesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_16,
    backgroundColor: COLORS.primaryWhiteHex,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: SPACING.space_8,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  placeholder: {
    width: 40,
  },
  favoritesList: {
    padding: SPACING.space_16,
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    marginBottom: SPACING.space_16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderBottomLeftRadius: BORDERRADIUS.radius_20,
  },
  favoriteInfo: {
    flex: 1,
    padding: SPACING.space_16,
    justifyContent: 'space-between',
  },
  favoriteName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  favoritePrice: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  removeButton: {
    position: 'absolute',
    right: SPACING.space_16,
    top: SPACING.space_16,
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
  emptySubtext: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    textAlign: 'center',
    marginTop: SPACING.space_8,
    marginBottom: SPACING.space_24,
  },
  browseButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
  },
  browseButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
});

export default FavoritesScreen;
