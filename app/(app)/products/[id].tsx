import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Dimensions,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { getProductById } from '../../../src/firebase/getData';
import { Product } from '../../../src/types/database';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useCart } from '../../../src/store/CartContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../src/store/store';

const { width } = Dimensions.get('window');

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToFavorites, removeFromFavorites, isFavorite } = useStore();
  const { dispatch } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const productData = await getProductById(id as string);
        setProduct(productData);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    const sizes = ['Small', 'Medium', 'Large'];
    const cartItem = {
      id: product.id,
      name: product.name,
      imagelink_square: product.imagelink_square,
      special_ingredient: product.special_ingredient,
      roasted: product.roasted,
      price: product.prices[selectedSize],
      size: sizes[selectedSize],
      quantity: quantity,
    };
    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    setQuantity(1);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleToggleFavorite = async () => {
    if (!product) return;
    try {
      if (isFavorite(product.id)) {
        await removeFromFavorites(product.id);
      } else {
        await addToFavorites(product);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const productLink = `https://yourapp.com/products/${product.id}`;
      await Share.share({
        message: `Check out this product: ${product.name} - ₹${product.prices[selectedSize].toFixed(2)}\n${productLink}`,
        url: productLink,
        title: product.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the product.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff9800" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sizes = ['Small', 'Medium', 'Large'];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {showSuccess && (
        <View style={styles.successToast}>
          <Text style={styles.successToastText}>Added to cart!</Text>
        </View>
      )}
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#fff' },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome name="arrow-left" size={22} color="#222" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Animatable.Image
            animation="fadeInDown"
            delay={200}
            duration={900}
            source={{ uri: product.imagelink_square }}
            style={styles.image}
          />
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <FontAwesome 
              name={isFavorite(product.id) ? 'heart' : 'heart-o'} 
              size={26} 
              color={isFavorite(product.id) ? '#e53935' : '#222'} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <MaterialIcons name="share" size={26} color="#222" />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{product.name}</Text>
              {product.special_ingredient ? (
                <Text style={styles.special}>{product.special_ingredient}</Text>
              ) : null}
              {product.roasted ? (
                <Text style={styles.roasted}>Roasted: {product.roasted}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.price}>₹{product.prices[selectedSize]?.toFixed(2)}</Text>
          <Text style={styles.sectionTitle}>Size</Text>
          <View style={styles.sizesContainer}>
           {sizes.map((size, index) => (
  typeof product.prices[index] === 'number' && product.prices[index] > 0 && (
    <TouchableOpacity
      key={size}
      style={[styles.sizeButton, selectedSize === index && styles.selectedSize]}
      onPress={() => setSelectedSize(index)}
    >
      <Text style={[styles.sizeText, selectedSize === index && styles.selectedSizeText]}>
        {size}
      </Text>
      <Text style={[styles.priceText, selectedSize === index && styles.selectedSizeText]}>
        ₹{product.prices[index].toFixed(2)}
      </Text>
    </TouchableOpacity>
  )
))}

          </View>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
              <FontAwesome name="minus" size={16} color="#222" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={incrementQuantity}>
              <FontAwesome name="plus" size={16} color="#222" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
          {product.ingredients && product.ingredients.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientsContainer}>
                {product.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    color: '#e53935',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 60,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  special: {
    fontSize: 16,
    color: '#ff9800',
    marginTop: 2,
    fontWeight: '600',
  },
  roasted: {
    fontSize: 14,
    color: '#8d6e63',
    marginTop: 2,
    fontWeight: '500',
  },
  price: {
    fontSize: 22,
    color: '#e53935',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 18,
    marginBottom: 6,
  },
  sizesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  sizeButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedSize: {
    backgroundColor: '#ffecb3',
    borderColor: '#ff9800',
  },
  sizeText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  selectedSizeText: {
    color: '#e65100',
    fontWeight: 'bold',
  },
  priceText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  quantityButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  quantityText: {
    fontSize: 18,
    color: '#222',
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
    marginTop: 2,
    lineHeight: 22,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#222',
    marginLeft: 6,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: 'center',
  },
  addToCartButton: {
    backgroundColor: '#ff9800',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
});