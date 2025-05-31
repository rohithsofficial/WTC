import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const ProductDetailScreen = () => {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Product Detail Screen</Text>
      <Text>Product ID: {id}</Text>
    </View>
  );
};

export default ProductDetailScreen; 