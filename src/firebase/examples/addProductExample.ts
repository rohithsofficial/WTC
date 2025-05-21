import { addCategory, addMultipleProducts } from '../addData';
import { Category, Product } from '../../types/database';

// Function to add category and then products
const addCategoryWithProducts = async () => {
  const categoryData: Omit<Category, 'id'> = {
  name: "Desserts",
  description: "Sweet treats like cakes, cookies, pastries, and ice cream.",
  image: "https://res.cloudinary.com/dya48ufj5/image/upload/v1747369525/samples/dessert-on-a-plate.jpg",
  createdAt: new Date().toISOString(),
};

  try {
    // Step 1: Add Category
    const categoryId = await addCategory(categoryData);
    console.log('Category added with ID:', categoryId);

    // Step 2: Define products using the categoryId
    const products: Omit<Product, 'id'>[] = [
     {
    name: "Chocolate Lava Cake",
    prices: [5.99],
    imagelink_square: "https://res.cloudinary.com/dya48ufj5/image/upload/v1747369525/samples/coffee.jpg",
    special_ingredient: "Molten Chocolate Center",
    type: "Dessert",
    description: "Warm chocolate cake with a gooey molten center.",
    average_rating: 4.9,
    ratings_count: 150,
    roasted: "Not Roasted",
    ingredients: ["Chocolate", "Flour", "Sugar", "Eggs", "Butter"],
    categoryId,  // assign categoryId dynamically before use
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Vanilla Cheesecake",
    prices: [6.50, 8.00],
    imagelink_square: "https://res.cloudinary.com/dya48ufj5/image/upload/v1747369525/samples/coffee.jpg",
    special_ingredient: "Creamy Vanilla Flavor",
    type: "Dessert",
    description: "Classic creamy cheesecake with a smooth vanilla flavor.",
    average_rating: 4.7,
    ratings_count: 100,
    roasted: "Not Roasted",
    ingredients: ["Cream Cheese", "Sugar", "Vanilla Extract", "Graham Cracker Crust"],
    categoryId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
    ];

    // Step 3: Add Products
    const productIds = await addMultipleProducts(products);
    console.log('Successfully added products with IDs:', productIds);

  } catch (error) {
    console.error('Error adding category with products:', error);
  }
};

// Run the function
export {
  addCategoryWithProducts
};
