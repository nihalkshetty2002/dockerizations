/**
 * Kafka Usage Example
 * 
 * This file demonstrates:
 * 1. Setting up a Kafka MongoDB connector
 * 2. Creating a producer that sends messages every 5 seconds
 * 3. Creating a consumer to consume messages from a topic
 * 4. Subscribing to a topic to receive messages
 * 5. Saving received messages to a file
 */

require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const KafkaProducer = require('../src/producers/kafka-producer');
const KafkaConsumer = require('../src/consumers/kafka-consumer');
const BaseConnector = require('../src/connectors/base-connector');

// Configuration
const DB_CONFIG = {
  db: 'kafka',
  host: '172.52.10.57',
  port: 27017,
  collection: 'messages',
  username: 'admin',
  password: 'admin'
};

const TOPIC_NAME = 'example-messages-topic';
const OUTPUT_FILE = path.join(__dirname, 'received-messages.json');

// Initialize file with empty array
fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));

/**
 * 1. Create and configure MongoDB Kafka Connector
 * Note: This expects Kafka Connect to be properly set up
 */
async function setupMongoDBConnector() {
  console.log('Setting up MongoDB Kafka Connector...');
  
  try {
    // Correct format for the Kafka Connect REST API
    const mongodbConnector = new BaseConnector('mongodb-sink-connector', {
      name: 'mongodb-sink-connector',
      config: {
        'connector.class': 'com.mongodb.kafka.connect.MongoSinkConnector',
        'tasks.max': '1',
        'topics': TOPIC_NAME,
        'connection.uri': `mongodb://${DB_CONFIG.username}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}`,
        'database': DB_CONFIG.db,
        'collection': DB_CONFIG.collection,
        'key.converter': 'org.apache.kafka.connect.storage.StringConverter',
        'value.converter': 'org.apache.kafka.connect.json.JsonConverter',
        'value.converter.schemas.enable': 'false',
        'document.id.strategy': 'com.mongodb.kafka.connect.sink.processor.id.strategy.BsonOidStrategy'
      }
    });

    await mongodbConnector.create();
    console.log('MongoDB connector created successfully');
    return mongodbConnector;
  } catch (error) {
    console.error('Failed to create MongoDB connector:', error.message);
    console.log('Continuing example without MongoDB connector...');
    // Return null instead of throwing to allow the example to continue
    return null;
  }
}

/**
 * 2. Create a producer that sends messages every 5 seconds
 */
async function setupProducer() {
  console.log('Setting up Kafka producer...');
  
  const producer = new KafkaProducer({
    name: 'example-producer'
  });
  
  await producer.connect();
  console.log('Producer connected successfully');
  
  // Start sending messages every 5 seconds
  const messageInterval = setInterval(async () => {
    try {
      const message = generateSampleMessage();
      await producer.sendMessage(TOPIC_NAME, message);
      console.log('Sent message:', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, 5000);
  
  return { producer, messageInterval };
}

/**
 * 3 & 4. Create consumer and subscribe to topic
 */
async function setupConsumer() {
  console.log('Setting up Kafka consumer...');
  
  const consumer = new KafkaConsumer({
    name: 'example-consumer',
    groupId: 'example-consumer-group',
    fromBeginning: true
  });
  
  await consumer.connect();
  console.log('Consumer connected successfully');
  
  // Subscribe to the topic
  await consumer.subscribe(TOPIC_NAME);
  console.log(`Consumer subscribed to topic: ${TOPIC_NAME}`);
  
  // 5. Save messages to file as they arrive
  await consumer.consume(async (message) => {
    console.log(`Received message from topic ${message.topic}:`, message.value);
    
    // Read current messages from file
    const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const messages = JSON.parse(fileContent);
    
    // Add new message with timestamp
    messages.push({
      ...message.value,
      receivedAt: new Date().toISOString(),
      offset: message.offset,
      partition: message.partition
    });
    
    // Save updated messages to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(messages, null, 2));
    console.log('Message saved to file:', OUTPUT_FILE);
  });
  
  return consumer;
}

/**
 * Generate sample message with synthetic data
 */
function generateSampleMessage() {
  const types = ['order', 'user', 'product', 'shipment'];
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  
  return {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    data: {
      value: Math.random() * 1000,
      quantity: Math.floor(Math.random() * 10) + 1
    },
    timestamp: new Date().toISOString(),
    source: 'kafka-example-producer'
  };
}

/**
 * Main execution function
 */
async function main() {
  console.log('Starting Kafka usage example...');
  
  let connector, producer, consumer, messageInterval;
  
  try {
    // Try to setup MongoDB connector, but continue even if it fails
    try {
      connector = await setupMongoDBConnector();
    } catch (error) {
      console.log('MongoDB connector setup failed, continuing with example...');
    }
    
    // Setup producer
    const producerSetup = await setupProducer();
    producer = producerSetup.producer;
    messageInterval = producerSetup.messageInterval;
    
    // Setup consumer
    consumer = await setupConsumer();
    
    console.log('\nKafka example is running!');
    console.log('- Producer is sending messages every 5 seconds');
    console.log('- Consumer is receiving messages and saving to file');
    if (connector) {
      console.log('- MongoDB connector is storing messages in the database');
    } else {
      console.log('- MongoDB connector is NOT active (setup failed)');
    }
    console.log(`\nPress Ctrl+C to stop the example`);
    
    // Setup cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      
      // Stop message interval
      clearInterval(messageInterval);
      
      // Disconnect producer and consumer
      if (producer) await producer.disconnect();
      if (consumer) await consumer.disconnect();
      
      console.log('Successfully shut down all components');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error in Kafka example:', error);
    
    // Cleanup on error
    if (messageInterval) clearInterval(messageInterval);
    if (producer) await producer.disconnect();
    if (consumer) await consumer.disconnect();
    
    process.exit(1);
  }
}

// Start the example
main().catch(console.error); 