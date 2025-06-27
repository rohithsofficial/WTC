// src/firebase/productService.ts
import { db } from './firebase-config';
import { Product, Category } from '../types/database';
import { Product as ProductInterface, Banner } from '../types/interfaces';

// Fetch all categories
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = db.collection('categories');
    const q = categoriesRef.orderBy('createdAt', 'desc');
    
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Fetch all products with categories
export const fetchAllProductsWithCategories = async () => {
  try {
    // First fetch all categories
    const categories = await fetchCategories();
    
    // Then fetch all products
    const productsCollection = db.collection('products');
    const productSnapshot = await productsCollection.get();
    const products = productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductInterface));

    // Group products by category
    const productsByCategory = categories.map(category => ({
      category,
      products: products.filter(product => product.categoryId === category.id)
    }));

    return {
      categories,
      productsByCategory,
      allProducts: products
    };
  } catch (error) {
    console.error('Error fetching products with categories:', error);
    return {
      categories: [],
      productsByCategory: [],
      allProducts: []
    };
  }
};

// Fetch products by category ID
export const fetchProductsByCategory = async (categoryId: string): Promise<ProductInterface[]> => {
  try {
    const productsCollection = db.collection('products');
    const q = productsCollection.where('categoryId', '==', categoryId);
    const productSnapshot = await q.get();
    return productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductInterface));
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return [];
  }
};

// Fetch products by type (Coffee, Tea, etc.)
export const fetchProductsByType = async (type: string): Promise<ProductInterface[]> => {
  try {
    const productsCollection = db.collection('products');
    const q = productsCollection.where('type', '==', type);
    const productSnapshot = await q.get();
    return productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductInterface));
  } catch (error) {
    console.error('Error fetching products by type:', error);
    return [];
  }
};

// Search products by name
export const searchProducts = async (searchTerm: string): Promise<ProductInterface[]> => {
  try {
    const productsCollection = db.collection('products');
    const productSnapshot = await productsCollection.get();
    const products = productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductInterface));

    // Filter products by name (case-insensitive)
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};

// Fetch product details by ID
export const fetchProductById = async (productId: string): Promise<ProductInterface | null> => {
  try {
    console.log('Fetching product with ID:', productId);
    const productDoc = db.collection('products').doc(productId);
    console.log('Product document reference created');
    
    const productSnapshot = await productDoc.get();
    console.log('Product snapshot exists:', productSnapshot.exists);
    
    if (productSnapshot.exists) {
      const data = productSnapshot.data();
      console.log('Raw product data:', data);
      
      const productData = {
        id: productSnapshot.id,
        ...data
      } as ProductInterface;
      
      console.log('Processed product data:', productData);
      return productData;
    }
    
    console.log('No product found with ID:', productId);
    return null;
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error; // Re-throw to handle in the component
  }
};

// Check and initialize database if needed
export const checkAndInitializeDatabase = async () => {
  try {
    console.log('Checking if database needs initialization...');
    const productsRef = db.collection('products');
    const productsSnapshot = await productsRef.get();
    
    if (productsSnapshot.empty) {
      console.log('Database is empty, initializing with sample data...');
      const { initializeProducts } = await import('./setupDatabase');
      await initializeProducts();
      console.log('Database initialized successfully');
    } else {
      console.log('Database already has data, skipping initialization');
    }
  } catch (error) {
    console.error('Error checking/initializing database:', error);
  }
};

export const fetchActiveBanners = async (): Promise<Banner[]> => {
  try {
    console.log('Fetching banners...');
    const bannersRef = db.collection('banners');
    const q = bannersRef.where('isActive', '==', true);
    
    const querySnapshot = await q.get();
    console.log('Banner query snapshot size:', querySnapshot.size);
    
    // If no banners found, return a test banner
    if (querySnapshot.size === 0) {
      console.log('No banners found, returning test banner');
      return [{
        id: 'test-banner',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
        title: 'Welcome to Coffee Shop',
        subtitle: 'Discover our special blends',
        actionText: 'Explore Menu',
        actionUrl: 'https://example.com/menu',
        displayOrder: 1,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      }];
    }
    
    const banners = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // console.log('Raw banner data from Firestore:', {
      //   id: doc.id,
      //   data: data
      // });
      
      // Create banner object with proper field mapping
      const banner = {
        id: doc.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        imageUrl: data.imageurl || '',
        actionText: data.acitonText || 'Show Now',
        actionUrl: data.ActionUrl || '',
        displayOrder: data.DisplayOrder || 0,
        isActive: data.isActive || false,
        startDate: data.startDate?.toDate?.()?.toISOString() || new Date().toISOString(),
        endDate: data.endDate?.toDate?.()?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as Banner;

      // console.log('Processed banner:', banner);
      return banner;
    });

    const now = new Date().toISOString();
    console.log('Current time:', now);

    const filteredBanners = banners.filter(banner => {
      const isActive = banner.startDate <= now && banner.endDate >= now;
      // console.log('Banner date check:', {
      //   id: banner.id,
      //   startDate: banner.startDate,
      //   endDate: banner.endDate,
      //   isActive,
      //   imageUrl: banner.imageUrl,
      //   actionUrl: banner.actionUrl
      // });
      return isActive;
    });

    const sortedBanners = filteredBanners.sort((a, b) => a.displayOrder - b.displayOrder);
    // console.log('Final banners to display:', sortedBanners);

    return sortedBanners;
  } catch (error) {
    console.error('Error fetching banners:', error);
    throw error;
  }
};

// Fetch menu options
export const fetchMenuOptions = async (): Promise<{
  id: string;
  name: string;
  imageUrl: string;
  type: string;
}[]> => {
  try {
    const categoriesRef = db.collection('categories');
    const q = categoriesRef.orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      imageUrl: doc.data().image || '',
      type: doc.data().type || 'default'
    }));
  } catch (error) {
    console.error('Error fetching menu options:', error);
    return [];
  }
};
