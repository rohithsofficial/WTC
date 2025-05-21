import { 
  addCategoryWithProducts 
} from '../firebase/examples/addProductExample';

const populateDatabase = async () => {
  try {
    console.log('Starting database population...');

    console.log('Adding single product...');
    await addCategoryWithProducts()
      .catch(error => {
        console.error('Error in addSingleProduct:', error);
        throw error;
      });
    
    console.log('Database population completed successfully!');
  } catch (error) {
    console.error('Error in database population:', error);
    // Log the full error object for debugging
    console.error('Full error details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
};

// Run the population script
console.log('Initializing database population script...');
populateDatabase(); 