import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export const initializeDatabase = async () => {
  try {
    // Check if categories already exist
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    
    if (categoriesSnapshot.empty) {
      // Add categories
      const categories = [
        { id: '1', name: 'Electronics', image: 'https://picsum.photos/200' },
        { id: '2', name: 'Clothing', image: 'https://picsum.photos/200' },
        { id: '3', name: 'Books', image: 'https://picsum.photos/200' },
        { id: '4', name: 'Home & Kitchen', image: 'https://picsum.photos/200' },
      ];

      for (const category of categories) {
        await setDoc(doc(db, 'categories', category.id), category);
      }

      // Add products
      const products = [
        {
          id: '1',
          name: 'Smartphone',
          description: 'Latest model smartphone with advanced features',
          price: 699.99,
          categoryId: '1',
          image: 'https://picsum.photos/200',
          stock: 50,
        },
        {
          id: '2',
          name: 'Laptop',
          description: 'Powerful laptop for work and gaming',
          price: 1299.99,
          categoryId: '1',
          image: 'https://picsum.photos/200',
          stock: 30,
        },
        {
          id: '3',
          name: 'T-Shirt',
          description: 'Comfortable cotton t-shirt',
          price: 19.99,
          categoryId: '2',
          image: 'https://picsum.photos/200',
          stock: 100,
        },
        {
          id: '4',
          name: 'Novel',
          description: 'Bestselling fiction novel',
          price: 14.99,
          categoryId: '3',
          image: 'https://picsum.photos/200',
          stock: 75,
        },
      ];

      for (const product of products) {
        await setDoc(doc(db, 'products', product.id), product);
      }

      console.log('Database initialized successfully');
    } else {
      console.log('Database already initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}; 