import { db } from './firebase-config';
import { Product, Category, Order, User } from '../types/database';

// Add a product with auto-generated ID
export const addProduct = async (productData: Omit<Product, 'id'>) => {
  try {
    const productsRef = db.collection('products');
    const docRef = await productsRef.add({
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('Product added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// Add a product with custom ID
export const addProductWithId = async (productId: string, productData: Omit<Product, 'id'>) => {
  try {
    const productRef = db.collection('products').doc(productId);
    await productRef.set({
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('Product added with custom ID:', productId);
    return productId;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// Add multiple products at once
export const addMultipleProducts = async (products: Omit<Product, 'id'>[]) => {
  try {
    const results = await Promise.all(
      products.map(product => addProduct(product))
    );
    console.log('Added multiple products with IDs:', results);
    return results;
  } catch (error) {
    console.error('Error adding multiple products:', error);
    throw error;
  }
};

// Add a category
export const addCategory = async (categoryData: Omit<Category, 'id'>) => {
  try {
    const categoriesRef = db.collection('categories');

    // Check if category with the same name already exists
    const q = categoriesRef.where('name', '==', categoryData.name);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
      // Return existing category ID
      const existingDoc = querySnapshot.docs[0];
      console.log('Category already exists with ID:', existingDoc.id);
      return existingDoc.id;
    }

    // Create new category
    const docRef = await categoriesRef.add({
      ...categoryData,
      createdAt: new Date().toISOString()
    });

    console.log('New category added with ID:', docRef.id);
    return docRef.id;

  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

// Add an order
export const addOrder = async (orderData: Omit<Order, 'id'>) => {
  try {
    const ordersRef = db.collection('orders');
    const docRef = await ordersRef.add({
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('Order added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
};

// Add a user
export const addUser = async (userId: string, userData: Omit<User, 'id'>) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('User added with ID:', userId);
    return userId;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};
