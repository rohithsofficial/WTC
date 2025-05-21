// CoffeeSearchBar.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  setDoc,
  addDoc,
  getFirestore
} from 'firebase/firestore';

const CoffeeSearchBar = ({
  onProductSelect,
  placeholder = "Search coffee, pastries...",
  maxResults = 10,
  collectionName = "products",
  showRecent = true,
  firebaseDb = null,
  customStyles = {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const inputRef = useRef(null);
  const db = firebaseDb || getFirestore();
  const searchDelayRef = useRef(null);

  useEffect(() => {
    loadRecentSearches();

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setTimeout(() => {
        if (searchResults.length > 0 && !searchQuery) {
          setShowResults(false);
        }
      }, 200);
    });

    return () => {
      keyboardDidHideListener.remove();
      if (searchDelayRef.current) clearTimeout(searchDelayRef.current);
    };
  }, []);

  const searchProducts = async (searchText) => {
    if (!searchText || searchText.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const productsRef = collection(db, collectionName);
      const searchTextLower = searchText.toLowerCase();
      const searchTextUpper = searchTextLower + '\uf8ff';

      let q = query(
        productsRef,
        where('nameKeywords', '>=', searchTextLower),
        where('nameKeywords', '<=', searchTextUpper),
        orderBy('nameKeywords'),
        limit(maxResults)
      );

      let querySnapshot = await getDocs(q);
      let results = [];

      querySnapshot.forEach((doc) => {
        if (!results.some(item => item.id === doc.id)) {
          results.push({ id: doc.id, ...doc.data() });
        }
      });

      if (results.length < 3 && searchTextLower.length > 2) {
        q = query(
          productsRef,
          where('descriptionKeywords', '>=', searchTextLower),
          where('descriptionKeywords', '<=', searchTextUpper),
          orderBy('descriptionKeywords'),
          limit(maxResults - results.length)
        );

        querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (!results.some(item => item.id === doc.id)) {
            results.push({ id: doc.id, ...doc.data() });
          }
        });
      }

      results.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.popularity || 0) - (a.popularity || 0);
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateKeywords = (text) => {
    if (!text) return [];
    const textLower = text.toLowerCase();
    const words = textLower.split(/\s+/);
    const keywords = [];

    words.forEach(word => {
      if (word.length < 2) return;
      let currentKeyword = '';
      for (const letter of word) {
        currentKeyword += letter;
        if (currentKeyword.length > 1) {
          keywords.push(currentKeyword);
        }
      }
      keywords.push(word);
    });

    keywords.push(textLower);
    const textWithoutSpaces = textLower.replace(/\s+/g, '');
    if (textWithoutSpaces !== textLower) {
      keywords.push(textWithoutSpaces);
    }

    return [...new Set(keywords)];
  };

  const handleSearchInputChange = (text) => {
    setSearchQuery(text);

    if (searchDelayRef.current) {
      clearTimeout(searchDelayRef.current);
    }

    if (text.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchDelayRef.current = setTimeout(() => {
      searchProducts(text);
      setShowResults(true);
    }, 500);
  };

  const handleSelectProduct = (product) => {
    setSearchQuery(product.name);
    setShowResults(false);
    addToRecentSearches(product);
    if (onProductSelect) onProductSelect(product);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentCoffeeSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const addToRecentSearches = async (product) => {
    if (!showRecent) return;
    const filtered = recentSearches.filter(item => item.id !== product.id);
    const updated = [product, ...filtered].slice(0, 5);
    setRecentSearches(updated);

    try {
      await AsyncStorage.setItem('recentCoffeeSearches', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectProduct(item)}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.resultText}>{item.name}</Text>
        {item.price && <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, customStyles.container]}>
      <View style={styles.searchBar}>
        <TextInput
          ref={inputRef}
          value={searchQuery}
          onChangeText={handleSearchInputChange}
          placeholder={placeholder}
          style={styles.input}
          placeholderTextColor="#aaa"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.icon}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => searchProducts(searchQuery)} style={styles.icon}>
          <Icon name="search" size={22} color="#444" />
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 10 }} />}

      {showResults && (
        <FlatList
          data={searchResults.length ? searchResults : (showRecent ? recentSearches : [])}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 10
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    color: '#000'
  },
  icon: {
    marginLeft: 6
  },
  resultsList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: 250
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1
  },
  resultText: {
    fontSize: 16,
    color: '#333'
  },
  price: {
    fontSize: 14,
    color: '#777'
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10
  }
});

export default CoffeeSearchBar;
