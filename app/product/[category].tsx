import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const ProductCategoryScreen = () => {
  const { category } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Product Category Screen</Text>
      <Text>Category: {category}</Text>
    </View>
  );
};

export default ProductCategoryScreen; 