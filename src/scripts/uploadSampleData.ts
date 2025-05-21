import { addProduct, addCategory } from '../firebase/addData';
import { sampleProducts, sampleCategories } from './sampleData';

const uploadSampleData = async () => {
  try {
    console.log('Starting to upload sample data...');

    // Upload products
    console.log('Uploading products...');
    for (const product of sampleProducts) {
      try {
        const productId = await addProduct(product);
        console.log(`Added product "${product.name}" with ID: ${productId}`);
      } catch (error) {
        console.error(`Error adding product "${product.name}":`, error);
      }
    }

    // Upload categories
    console.log('\nUploading categories...');
    for (const category of sampleCategories) {
      try {
        const categoryId = await addCategory(category);
        console.log(`Added category "${category.name}" with ID: ${categoryId}`);
      } catch (error) {
        console.error(`Error adding category "${category.name}":`, error);
      }
    }

    console.log('\nSample data upload completed!');
  } catch (error) {
    console.error('Error in sample data upload:', error);
    process.exit(1);
  }
};

// Run the upload script
console.log('Initializing sample data upload...');
uploadSampleData(); 