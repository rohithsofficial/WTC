import { useState, useEffect } from 'react';
import { productService } from '../services/firebaseService';

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      setProducts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new product
  const addProduct = async (productData: any) => {
    try {
      setLoading(true);
      await productService.addProduct(productData);
      await fetchProducts(); // Refresh the products list
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (productId: string, productData: any) => {
    try {
      setLoading(true);
      await productService.updateProduct(productId, productData);
      await fetchProducts(); // Refresh the products list
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      setLoading(true);
      await productService.deleteProduct(productId);
      await fetchProducts(); // Refresh the products list
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  };
}; 