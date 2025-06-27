import { db } from './firebase-config';
import { Product, Category } from '../types/database';

// Get all products
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = db.collection('products');
    const querySnapshot = await productsRef.get();
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      } as Product);
    });

    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

// Get product by ID
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const docRef = db.collection('products').doc(productId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Product;
    }
    return null;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
};

// Get products by category
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const q = db.collection('products').where('type', '==', category);
    const querySnapshot = await q.get();
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      } as Product);
    });

    return products;
  } catch (error) {
    console.error('Error getting products by category:', error);
    throw error;
  }
};

// Get top rated products
export const getTopRatedProducts = async (limit_count: number = 5): Promise<Product[]> => {
  try {
    const q = db.collection('products')
      .orderBy('average_rating', 'desc')
      .limit(limit_count);
    const querySnapshot = await q.get();
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      } as Product);
    });

    return products;
  } catch (error) {
    console.error('Error getting top rated products:', error);
    throw error;
  }
};

// Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = db.collection('categories');
    const querySnapshot = await categoriesRef.get();
    
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      } as Category);
    });

    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}; 