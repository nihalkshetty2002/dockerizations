const KafkaService = require('../services/KafkaService');
const config = require('../config/config');

/**
 * Kafka administration utility class
 * Provides methods for managing topics and other Kafka resources
 */
class KafkaAdmin {
  /**
   * Create a new Kafka admin instance
   */
  constructor() {
    this.kafkaService = new KafkaService(config.KAFKA.core);
    this.isConnected = false;
  }
  
  /**
   * Connect to Kafka
   * 
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    
    try {
      console.log('Connecting to Kafka...');
      await this.kafkaService.connect();
      this.isConnected = true;
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error.message);
      throw error;
    }
  }
  
  /**
   * Disconnect from Kafka
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    
    try {
      console.log('Disconnecting from Kafka...');
      await this.kafkaService.disconnect();
      this.isConnected = false;
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a new Kafka topic
   * 
   * @param {string} topicName - The name of the topic to create
   * @param {Object} options - Topic configuration options
   * @returns {Promise<Object>}
   */
  async createTopic(topicName, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const topicConfig = {
        name: topicName,
        partitions: options.partitions || 1,
        replicationFactor: options.replicationFactor || 1,
        configs: options.configs || {}
      };
      
      console.log(`Creating topic: ${topicName}`);
      console.log('Configuration:', JSON.stringify(topicConfig, null, 2));
      
      const result = await this.kafkaService.createTopic(topicConfig);
      
      console.log(`Topic ${topicName} created successfully`);
      return result;
    } catch (error) {
      console.error(`Failed to create topic ${topicName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Delete a Kafka topic
   * 
   * @param {string} topicName - The name of the topic to delete
   * @returns {Promise<Object>}
   */
  async deleteTopic(topicName) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log(`Deleting topic: ${topicName}`);
      
      const result = await this.kafkaService.deleteTopic(topicName);
      
      console.log(`Topic ${topicName} deleted successfully`);
      return result;
    } catch (error) {
      console.error(`Failed to delete topic ${topicName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * List all topics in the Kafka cluster
   * 
   * @returns {Promise<Array<string>>}
   */
  async listTopics() {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log('Listing Kafka topics...');
      
      const topics = await this.kafkaService.listTopics();
      
      console.log('Available topics:');
      topics.forEach(topic => {
        console.log(` - ${topic}`);
      });
      
      return topics;
    } catch (error) {
      console.error('Failed to list topics:', error.message);
      throw error;
    }
  }
  
  /**
   * Get details about a specific topic
   * 
   * @param {string} topicName - The name of the topic to get details for
   * @returns {Promise<Object>}
   */
  async getTopicDetails(topicName) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log(`Getting details for topic: ${topicName}`);
      
      const details = await this.kafkaService.getTopicDetails(topicName);
      
      console.log(`Details for topic ${topicName}:`);
      console.log(JSON.stringify(details, null, 2));
      
      return details;
    } catch (error) {
      console.error(`Failed to get details for topic ${topicName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Check if a topic exists
   * 
   * @param {string} topicName - The name of the topic to check
   * @returns {Promise<boolean>}
   */
  async topicExists(topicName) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const topics = await this.kafkaService.listTopics();
      return topics.includes(topicName);
    } catch (error) {
      console.error(`Failed to check if topic ${topicName} exists:`, error.message);
      throw error;
    }
  }
  
  /**
   * Create a topic if it doesn't already exist
   * 
   * @param {string} topicName - The name of the topic to create
   * @param {Object} options - Topic configuration options
   * @returns {Promise<Object>}
   */
  async createTopicIfNotExists(topicName, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const exists = await this.topicExists(topicName);
      
      if (exists) {
        console.log(`Topic ${topicName} already exists`);
        return { name: topicName, exists: true };
      } else {
        return await this.createTopic(topicName, options);
      }
    } catch (error) {
      console.error(`Failed to create topic ${topicName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Command-line interface for the Kafka admin tool
 */
async function runKafkaAdmin() {
  const admin = new KafkaAdmin();
  
  try {
    await admin.connect();
    
    const command = process.argv[2]?.toLowerCase();
    const topicName = process.argv[3];
    
    switch (command) {
      case 'create':
        if (!topicName) {
          console.error('Missing topic name. Usage: node kafka-admin.js create <topic> [partitions] [replicationFactor]');
          process.exit(1);
        }
        
        const partitions = parseInt(process.argv[4] || '1', 10);
        const replicationFactor = parseInt(process.argv[5] || '1', 10);
        
        await admin.createTopic(topicName, { partitions, replicationFactor });
        break;
        
      case 'delete':
        if (!topicName) {
          console.error('Missing topic name. Usage: node kafka-admin.js delete <topic>');
          process.exit(1);
        }
        
        await admin.deleteTopic(topicName);
        break;
        
      case 'list':
        await admin.listTopics();
        break;
        
      case 'details':
        if (!topicName) {
          console.error('Missing topic name. Usage: node kafka-admin.js details <topic>');
          process.exit(1);
        }
        
        await admin.getTopicDetails(topicName);
        break;
        
      default:
        console.log('Kafka Admin Tool');
        console.log('----------------');
        console.log('Usage:');
        console.log('  node kafka-admin.js create <topic> [partitions] [replicationFactor]');
        console.log('  node kafka-admin.js delete <topic>');
        console.log('  node kafka-admin.js list');
        console.log('  node kafka-admin.js details <topic>');
        break;
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await admin.disconnect();
  }
}

// Run the admin tool if executed directly
if (require.main === module) {
  runKafkaAdmin().catch(err => {
    console.error('Failed to run Kafka admin tool:', err);
    process.exit(1);
  });
}

module.exports = KafkaAdmin; 