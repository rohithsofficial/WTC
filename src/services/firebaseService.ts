// Updated Firebase services for React Native Firebase SDK
import { auth, db } from '../firebase/firebase-config';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const signUpUser = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.updateProfile({
      displayName: displayName,
    });

    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      displayName: displayName,
      email: user.email,
      createdAt: new Date(),
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Product Operations
export const productService = {
  // Live updates for all products
  listenToAllProducts: (callback: (products: any[]) => void, errorCallback?: (error: any) => void) => {
    try {
      const productsRef = db.collection('products');
      const unsubscribe = productsRef.onSnapshot(
        (snapshot) => {
          const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(products);
        },
        (error) => {
          console.error('Error listening to products:', error);
          if (errorCallback) errorCallback(error);
        }
      );

      return unsubscribe; // Return unsubscribe function to detach listener
    } catch (error) {
      console.error('Error setting up snapshot listener:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  // Get all products
  getAllProducts: async () => {
    try {
      const querySnapshot = await db.collection('products').get();
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  },

  // Get product by ID
  getProductById: async (productId: string) => {
    try {
      const docSnap = await db.collection('products').doc(productId).get();
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  },

  // Add new product
  addProduct: async (productData: any) => {
    try {
      const docRef = await db.collection('products').add(productData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (productId: string, productData: any) => {
    try {
      await db.collection('products').doc(productId).update(productData);
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (productId: string) => {
    try {
      await db.collection('products').doc(productId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

// Order Operations
export const orderService = {
  // Get all orders
  getAllOrders: async () => {
    try {
      const querySnapshot = await db.collection('orders').get();
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  },

  // Get user orders
  getUserOrders: async (userId: string) => {
    try {
      const querySnapshot = await db.collection('orders').where('userId', '==', userId).get();
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  },

  // Add new order
  addOrder: async (orderData: any) => {
    try {
      const docRef = await db.collection('orders').add({
        ...orderData,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: string) => {
    try {
      await db.collection('orders').doc(orderId).update({ 
        status, 
        updatedAt: new Date().toISOString() 
      });
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

// User Operations
export const userService = {
  // Get user profile
  getUserProfile: async (userId: string) => {
    try {
      const docSnap = await db.collection('users').doc(userId).get();
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (userId: string, profileData: any) => {
    try {
      await db.collection('users').doc(userId).update({
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get user favorites
  getUserFavorites: async (userId: string) => {
    try {
      const docSnap = await db.collection('users').doc(userId).get();
      if (docSnap.exists() && docSnap.data()?.favorites) {
        return docSnap.data()?.favorites;
      }
      return [];
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
    }
  },

  // Update user favorites
  updateUserFavorites: async (userId: string, favorites: string[]) => {
    try {
      await db.collection('users').doc(userId).update({ favorites });
      return true;
    } catch (error) {
      console.error('Error updating user favorites:', error);
      throw error;
    }
  }
}; 

// Category Operations
export const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    try {
      const querySnapshot = await db.collection('categories').get();
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  },

  // Get category by ID
  getCategoryById: async (categoryId: string) => {
    try {
      const docSnap = await db.collection('categories').doc(categoryId).get();
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  },

  // Add new category
  addCategory: async (categoryData: any) => {
    try {
      const docRef = await db.collection('categories').add({
        ...categoryData,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  },

  // Update category
  updateCategory: async (categoryId: string, categoryData: any) => {
    try {
      await db.collection('categories').doc(categoryId).update({
        ...categoryData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (categoryId: string) => {
    try {
      await db.collection('categories').doc(categoryId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Get featured products
  getFeaturedProducts: async () => {
    try {
      const querySnapshot = await db.collection('products').where('featured', '==', true).get();
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  },
  
  // Toggle product featured status
  toggleFeaturedStatus: async (id: string, featured: boolean) => {
    try {
      await db.collection('products').doc(id).update({
        featured: featured
      });
      return true;
    } catch (error) {
      console.error('Error updating product featured status:', error);
      throw error;
    }
  }
};