import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { getAllProducts, getProductsByCategory, getAllCategories } from '../../src/firebase/getData';
import { Product, Category } from '../../src/types/database';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch products and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      const categoriesData = await getAllCategories();
      setCategories(categoriesData);

      const productsData = await getAllProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by category
  const filterByCategory = async (category: string) => {
    try {
      setLoading(true);
      setSelectedCategory(category);
      
      const filteredProducts = category === 'All'
        ? await getAllProducts()
        : await getProductsByCategory(category);
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error filtering products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Render category item
  const renderCategoryItem = ({ item }: { item: Category | { id: 'all', name: 'All' } }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.name && styles.selectedCategory
      ]}
      onPress={() => filterByCategory(item.name)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item.name && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Render product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard}>
      <Image
        source={{ uri: item.imagelink_square }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription}>{item.description}</Text>
        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>{item.prices[0]}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {item.average_rating}</Text>
            <Text style={styles.ratingCount}>({item.ratings_count})</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={[{ id: 'all', name: 'All' }, ...categories]}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id}
        style={styles.categoriesList}
        showsHorizontalScrollIndicator={false}
      />
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        style={styles.productsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesList: {
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategory: {
    backgroundColor: '#000',
  },
  categoryText: {
    color: '#000',
    fontSize: 16,
  },
  selectedCategoryText: {
    color: '#fff',
  },
  productsList: {
    padding: 10,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#f1c40f',
    fontWeight: 'bold',
    marginRight: 5,
  },
  ratingCount: {
    color: '#95a5a6',
    fontSize: 12,
  },
}); 