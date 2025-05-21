import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { db ,auth } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';// Adjust path as needed

export const signUpUser = async (email: string, password: string, fullName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: fullName,
    });

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      fullName: fullName,
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
  // Get all products
  getAllProducts: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
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
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
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
      const docRef = await addDoc(collection(db, 'products'), productData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (productId: string, productData: any) => {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, productData);
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
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
      const querySnapshot = await getDocs(collection(db, 'orders'));
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
      const q = query(collection(db, 'orders'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
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
      const docRef = await addDoc(collection(db, 'orders'), {
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
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
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
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
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
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
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
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().favorites) {
        return docSnap.data().favorites;
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
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { favorites });
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
      const querySnapshot = await getDocs(collection(db, 'categories'));
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
      const docRef = doc(db, 'categories', categoryId);
      const docSnap = await getDoc(docRef);
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
      const docRef = await addDoc(collection(db, 'categories'), {
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
      const docRef = doc(db, 'categories', categoryId);
      await updateDoc(docRef, {
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
      const docRef = doc(db, 'categories', categoryId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
  // Get featured products
  getFeaturedProducts: async () => {
    try {
      const productsRef = collection(db, 'products');
      const featuredQuery = query(productsRef, where('featured', '==', true));
      const querySnapshot = await getDocs(featuredQuery);
      
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
  toggleFeaturedStatus: async (id, featured) => {
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        featured: featured
      });
      return true;
    } catch (error) {
      console.error('Error updating product featured status:', error);
      throw error;
    }
  }
};
