import { collection, addDoc, setDoc, doc, updateDoc , query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import { Product, Category, Order, User } from '../types/database';

// Add a product with auto-generated ID
export const addProduct = async (productData: Omit<Product, 'id'>) => {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
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
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
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
    const categoriesRef = collection(db, 'categories');

    // Check if category with the same name already exists
    const q = query(categoriesRef, where('name', '==', categoryData.name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Return existing category ID
      const existingDoc = querySnapshot.docs[0];
      console.log('Category already exists with ID:', existingDoc.id);
      return existingDoc.id;
    }

    // Create new category
    const docRef = await addDoc(categoriesRef, {
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
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
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
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
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
