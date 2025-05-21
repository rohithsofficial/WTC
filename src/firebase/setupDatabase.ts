import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';

// Sample products data
const sampleProducts = [
  {
    name: "Cappuccino",
    prices: [4.99, 5.99, 6.99],
    imagelink_square: "https://firebasestorage.googleapis.com/coffee-app/cappuccino.jpg",
    special_ingredient: "With Oat Milk",
    type: "Coffee",
    description: "A perfect blend of espresso and steamed milk, topped with a deep layer of foam.",
    average_rating: 4.5,
    ratings_count: 128,
    roasted: "Medium Roasted",
    ingredients: ["Espresso", "Steamed Milk", "Foam"],
    categoryId: "coffee"
  },
  {
    name: "Latte",
    prices: [3.99, 4.99, 5.99],
    imagelink_square: "https://firebasestorage.googleapis.com/coffee-app/latte.jpg",
    special_ingredient: "With Vanilla",
    type: "Coffee",
    description: "Smooth and mild coffee with steamed milk and a light layer of foam.",
    average_rating: 4.3,
    ratings_count: 98,
    roasted: "Light Roasted",
    ingredients: ["Espresso", "Steamed Milk", "Light Foam"],
    categoryId: "coffee"
  },
  {
    name: "Espresso",
    prices: [2.99, 3.99, 4.99],
    imagelink_square: "https://firebasestorage.googleapis.com/coffee-app/espresso.jpg",
    special_ingredient: "Pure Coffee",
    type: "Coffee",
    description: "Strong and concentrated coffee served in small portions.",
    average_rating: 4.8,
    ratings_count: 156,
    roasted: "Dark Roasted",
    ingredients: ["Pure Coffee"],
    categoryId: "coffee"
  },
  {
    name: "Green Tea Latte",
    prices: [4.49, 5.49, 6.49],
    imagelink_square: "https://firebasestorage.googleapis.com/coffee-app/green-tea.jpg",
    special_ingredient: "With Matcha",
    type: "Tea",
    description: "Japanese green tea powder mixed with steamed milk.",
    average_rating: 4.6,
    ratings_count: 112,
    roasted: "N/A",
    ingredients: ["Matcha Powder", "Steamed Milk"],
    categoryId: "tea"
  }
];

// Sample categories data
const sampleCategories = [
  {
    name: "Coffee",
    description: "Our premium coffee selection",
    image: "https://firebasestorage.googleapis.com/coffee-app/coffee-category.jpg"
  },
  {
    name: "Tea",
    description: "Finest tea collection",
    image: "https://firebasestorage.googleapis.com/coffee-app/tea-category.jpg"
  },
  {
    name: "Smoothie",
    description: "Fresh fruit smoothies",
    image: "https://firebasestorage.googleapis.com/coffee-app/smoothie-category.jpg"
  }
];

// Sample menu options data
const sampleMenuOptions = [
  {
    name: "Breakfast",
    imageUrl: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    type: "breakfast",
    displayOrder: 1
  },
  {
    name: "Lunch",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
    type: "lunch",
    displayOrder: 2
  },
  {
    name: "Dinner",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    type: "dinner",
    displayOrder: 3
  },
  {
    name: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80",
    type: "desserts",
    displayOrder: 4
  }
];

// Function to initialize products
export const initializeProducts = async () => {
  try {
    // Check if products already exist
    const productsRef = collection(db, 'products');
    const existingProducts = await getDocs(productsRef);
    
    if (existingProducts.empty) {
      // Add sample products
      for (const product of sampleProducts) {
        await addDoc(productsRef, {
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      console.log('Sample products added successfully');
    } else {
      console.log('Products collection is not empty, skipping initialization');
    }

    // Initialize categories
    const categoriesRef = collection(db, 'categories');
    const existingCategories = await getDocs(categoriesRef);

    if (existingCategories.empty) {
      // Add sample categories
      for (const category of sampleCategories) {
        await addDoc(categoriesRef, {
          ...category,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Sample categories added successfully');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Function to add a new product
export const addNewProduct = async (productData: any) => {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding new product:', error);
    throw error;
  }
};

// Function to add a new category
export const addNewCategory = async (categoryData: any) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const docRef = await addDoc(categoriesRef, {
      ...categoryData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding new category:', error);
    throw error;
  }
};

// Function to check if product exists
export const checkProductExists = async (name: string) => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking product:', error);
    throw error;
  }
};

// Initialize database with sample data
export const initializeDatabase = async () => {
  try {
    // Check if products collection is empty
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    if (productsSnapshot.empty) {
      console.log('Adding sample products...');
      for (const product of sampleProducts) {
        await addDoc(productsRef, {
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Check if categories collection is empty
    const categoriesRef = collection(db, 'categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    if (categoriesSnapshot.empty) {
      console.log('Adding sample categories...');
      for (const category of sampleCategories) {
        await addDoc(categoriesRef, {
          ...category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Check if menu options collection is empty
    const menuOptionsRef = collection(db, 'menuOptions');
    const menuOptionsSnapshot = await getDocs(menuOptionsRef);
    
    if (menuOptionsSnapshot.empty) {
      console.log('Adding sample menu options...');
      for (const option of sampleMenuOptions) {
        await addDoc(menuOptionsRef, {
          ...option,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}; 