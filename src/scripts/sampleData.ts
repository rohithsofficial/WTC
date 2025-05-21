import { Product, Category } from '../types/database';

// Sample Products Data
export const sampleProducts: Omit<Product, 'id'>[] = [
  {
    name: "Cappuccino",
    prices: [4.99, 5.99, 6.99],
    imagelink_square: "https://example.com/images/cappuccino.jpg",
    special_ingredient: "Organic Milk Foam",
    type: "Coffee",
    description: "Classic Italian coffee drink with rich espresso and velvety milk foam",
    average_rating: 4.8,
    ratings_count: 245,
    roasted: "Medium Roast",
    ingredients: ["Espresso", "Steamed Milk", "Milk Foam"],
    categoryId: "coffee",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Caramel Macchiato",
    prices: [5.49, 6.49, 7.49],
    imagelink_square: "https://example.com/images/caramel-macchiato.jpg",
    special_ingredient: "Vanilla Syrup",
    type: "Coffee",
    description: "Freshly steamed milk with vanilla-flavored syrup, marked with espresso and caramel drizzle",
    average_rating: 4.6,
    ratings_count: 189,
    roasted: "Medium Roast",
    ingredients: ["Espresso", "Steamed Milk", "Vanilla Syrup", "Caramel Sauce"],
    categoryId: "coffee",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Matcha Green Tea Latte",
    prices: [4.99, 5.99, 6.99],
    imagelink_square: "https://example.com/images/matcha-latte.jpg",
    special_ingredient: "Ceremonial Grade Matcha",
    type: "Tea",
    description: "Premium Japanese matcha green tea with steamed milk",
    average_rating: 4.7,
    ratings_count: 156,
    roasted: "None",
    ingredients: ["Matcha Green Tea", "Steamed Milk", "Optional: Honey"],
    categoryId: "tea",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Mango Passion Fruit Smoothie",
    prices: [5.99, 6.99, 7.99],
    imagelink_square: "https://example.com/images/mango-smoothie.jpg",
    special_ingredient: "Fresh Mango Chunks",
    type: "Smoothie",
    description: "Tropical blend of fresh mango and passion fruit",
    average_rating: 4.9,
    ratings_count: 178,
    roasted: "None",
    ingredients: ["Mango", "Passion Fruit", "Yogurt", "Ice"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Dark Chocolate Mocha",
    prices: [5.49, 6.49, 7.49],
    imagelink_square: "https://example.com/images/dark-mocha.jpg",
    special_ingredient: "Belgian Dark Chocolate",
    type: "Coffee",
    description: "Rich espresso combined with dark chocolate and steamed milk",
    average_rating: 4.8,
    ratings_count: 212,
    roasted: "Dark Roast",
    ingredients: ["Espresso", "Dark Chocolate", "Steamed Milk", "Whipped Cream"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Sample Categories Data
export const sampleCategories: Omit<Category, 'id'>[] = [
  {
    name: "Hot Coffee",
    description: "Freshly brewed coffee and espresso-based drinks",
    image: "https://example.com/images/hot-coffee.jpg",
    createdAt: new Date().toISOString()
  },
  {
    name: "Iced Coffee",
    description: "Refreshing cold coffee beverages",
    image: "https://example.com/images/iced-coffee.jpg",
    createdAt: new Date().toISOString()
  },
  {
    name: "Tea Specialties",
    description: "Premium loose-leaf teas and tea lattes",
    image: "https://example.com/images/tea.jpg",
    createdAt: new Date().toISOString()
  },
  {
    name: "Smoothies",
    description: "Fresh fruit smoothies and blended beverages",
    image: "https://example.com/images/smoothies.jpg",
    createdAt: new Date().toISOString()
  },
  {
    name: "Seasonal Specials",
    description: "Limited time seasonal offerings",
    image: "https://example.com/images/seasonal.jpg",
    createdAt: new Date().toISOString()
  }
]; 