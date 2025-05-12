const { MongoClient } = require('mongodb');
const config = require('../config/config');

// MongoDB connection details (use from config or override)
const MONGODB_CONFIG = {
  host: '172.52.10.57',
  port: 27017,
  username: 'admin',
  password: 'admin',
  database: 'mongodb',
  collection: 'users'
};

// Connection URL
const url = `mongodb://${MONGODB_CONFIG.username}:${MONGODB_CONFIG.password}@${MONGODB_CONFIG.host}:${MONGODB_CONFIG.port}`;

/**
 * Insert test data into MongoDB
 */
async function insertTestData() {
  const client = new MongoClient(url);
  
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_CONFIG.host}:${MONGODB_CONFIG.port}...`);
    await client.connect();
    
    const db = client.db(MONGODB_CONFIG.database);
    const collection = db.collection(MONGODB_CONFIG.collection);
    
    console.log(`Connected to MongoDB. Using collection: ${MONGODB_CONFIG.collection}`);
    
    // Generate test user data
    const testUsers = [
      {
        username: 'john.doe',
        email: 'john.doe@example.com',
        fullName: 'John Doe',
        age: 32,
        active: true,
        roles: ['user', 'admin'],
        createdAt: new Date(),
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        }
      },
      {
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        fullName: 'Jane Smith',
        age: 28,
        active: true,
        roles: ['user'],
        createdAt: new Date(),
        address: {
          street: '456 Broadway',
          city: 'Boston',
          state: 'MA',
          zip: '02101'
        }
      },
      {
        username: 'bob.johnson',
        email: 'bob.johnson@example.com',
        fullName: 'Bob Johnson',
        age: 45,
        active: false,
        roles: ['user'],
        createdAt: new Date(),
        address: {
          street: '789 Oak St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601'
        }
      }
    ];
    
    // Insert the test data
    console.log('Inserting test users into MongoDB...');
    const result = await collection.insertMany(testUsers);
    
    console.log(`Successfully inserted ${result.insertedCount} test users!`);
    console.log('Inserted IDs:');
    Object.values(result.insertedIds).forEach(id => {
      console.log(` - ${id}`);
    });
    
    console.log('\nThe connector should detect these inserts and produce messages to Kafka.');
    console.log('You should see them in the MongoDB consumer if it\'s running.');
    
    return result;
  } catch (error) {
    console.error('Error inserting test data:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

/**
 * Update a test user in MongoDB
 */
async function updateTestUser() {
  const client = new MongoClient(url);
  
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_CONFIG.host}:${MONGODB_CONFIG.port}...`);
    await client.connect();
    
    const db = client.db(MONGODB_CONFIG.database);
    const collection = db.collection(MONGODB_CONFIG.collection);
    
    // Find a user to update (first user in the collection)
    const userToUpdate = await collection.findOne({});
    
    if (!userToUpdate) {
      console.log('No users found to update. Please run insert test data first.');
      return null;
    }
    
    console.log(`Found user to update: ${userToUpdate.username || userToUpdate._id}`);
    
    // Update the user with new data
    const updateResult = await collection.updateOne(
      { _id: userToUpdate._id },
      { 
        $set: { 
          lastLogin: new Date(),
          active: !userToUpdate.active,
          updatedDescription: 'This user was updated by the test script'
        } 
      }
    );
    
    console.log(`Updated user: ${updateResult.modifiedCount} document(s) modified`);
    console.log('The connector should detect this update and produce a message to Kafka.');
    
    return updateResult;
  } catch (error) {
    console.error('Error updating test user:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

/**
 * Delete a test user from MongoDB
 */
async function deleteTestUser() {
  const client = new MongoClient(url);
  
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_CONFIG.host}:${MONGODB_CONFIG.port}...`);
    await client.connect();
    
    const db = client.db(MONGODB_CONFIG.database);
    const collection = db.collection(MONGODB_CONFIG.collection);
    
    // Find a user to delete (last user in the collection)
    const users = await collection.find({}).toArray();
    
    if (users.length === 0) {
      console.log('No users found to delete. Please run insert test data first.');
      return null;
    }
    
    const userToDelete = users[users.length - 1];
    console.log(`Found user to delete: ${userToDelete.username || userToDelete._id}`);
    
    // Delete the user
    const deleteResult = await collection.deleteOne({ _id: userToDelete._id });
    
    console.log(`Deleted user: ${deleteResult.deletedCount} document(s) deleted`);
    console.log('The connector should detect this deletion and produce a message to Kafka.');
    
    return deleteResult;
  } catch (error) {
    console.error('Error deleting test user:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

/**
 * Main function to run different operations based on command line arguments
 */
async function main() {
  const operation = process.argv[2]?.toLowerCase() || 'insert';
  
  try {
    switch (operation) {
      case 'insert':
        await insertTestData();
        break;
      case 'update':
        await updateTestUser();
        break;
      case 'delete':
        await deleteTestUser();
        break;
      default:
        console.log('Unknown operation. Use: insert, update, or delete');
    }
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  insertTestData,
  updateTestUser,
  deleteTestUser
}; 