const MongoDBConnector = require('../connectors/mongodb-connector');

/**
 * Script to create and run a MongoDB connector
 * This script simplifies setting up a MongoDB connector with custom options
 */
async function main() {
  try {
    // Parse command line arguments for MongoDB configuration
    const mongoOptions = {
      host: process.env.MONGO_HOST || '172.52.10.57',
      port: parseInt(process.env.MONGO_PORT || '27017'),
      username: process.env.MONGO_USERNAME || 'admin',
      password: process.env.MONGO_PASSWORD || 'admin',
      database: process.env.MONGO_DATABASE || 'mongodb',
      collection: process.env.MONGO_COLLECTION || 'users'
    };
    
    // Allow overriding from command line arguments
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        
        switch (key.toLowerCase()) {
          case 'host':
            mongoOptions.host = value;
            break;
          case 'port':
            mongoOptions.port = parseInt(value);
            break;
          case 'username':
            mongoOptions.username = value;
            break;
          case 'password':
            mongoOptions.password = value;
            break;
          case 'database':
          case 'db':
            mongoOptions.database = value;
            break;
          case 'collection':
          case 'col':
            mongoOptions.collection = value;
            break;
          case 'name':
            mongoOptions.name = value;
            break;
        }
      }
    }
    
    console.log('Creating MongoDB Connector with configuration:');
    console.log(JSON.stringify({
      ...mongoOptions,
      password: '******' // Don't show password in logs
    }, null, 2));
    
    // Create and run the MongoDB connector
    const connector = new MongoDBConnector(mongoOptions);
    await connector.create();
    
    // Check the connector status
    await new Promise(resolve => setTimeout(resolve, 5000));
    const status = await connector.getStatus();
    
    console.log('\nConnector Status:');
    console.log(status);
    
    console.log('\nMongoDB connector is now running!');
    console.log('When data is added, updated, or deleted from the MongoDB collection,');
    console.log('it will be automatically captured and sent to Kafka.');
    console.log('\nTo run a consumer for this connector:');
    console.log(`node src/consumers/mongodb-consumer.js ${mongoOptions.topicPrefix || 'mongodb.'}${mongoOptions.collection}`);
    
    // If running with --monitor flag, keep the process running
    if (process.argv.includes('--monitor')) {
      console.log('\nMonitoring connector status (press Ctrl+C to exit)...');
      
      // Set up interval to check status periodically
      const interval = setInterval(async () => {
        try {
          const currentStatus = await connector.getStatus();
          console.log(`\n[${new Date().toISOString()}] Connector Status:`);
          console.log(JSON.stringify(currentStatus, null, 2));
        } catch (error) {
          console.error('Error checking connector status:', error.message);
        }
      }, 30000); // Check every 30 seconds
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        clearInterval(interval);
        console.log('\nShutting down...');
        process.exit(0);
      });
    } else {
      console.log('\nConnector setup complete. Exiting now.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running MongoDB connector:', error.message);
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Error in main function:', err);
  process.exit(1);
}); 