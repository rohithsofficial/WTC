import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

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
    ingredients: ["Espresso", "Steamed Milk", "Foam"]
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
    ingredients: ["Espresso", "Steamed Milk", "Light Foam"]
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
    ingredients: ["Matcha Powder", "Steamed Milk"]
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
  }
];

const initializeDatabase = async () => {
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
    } else {
      console.log('Categories collection is not empty, skipping initialization');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Run the initialization
initializeDatabase()
  .then(() => console.log('Database initialization completed'))
  .catch(error => console.error('Database initialization failed:', error)); 