const KafkaService = require('../services/KafkaService');
const config = require('../config/config');

/**
 * A generic Kafka consumer class with features for
 * consuming messages from topics and handling common consumer tasks
 */
class KafkaConsumer {
  /**
   * Create a new Kafka consumer
   * 
   * @param {Object} options - Configuration options for the consumer
   */
  constructor(options = {}) {
    this.options = {
      name: 'generic-consumer',
      groupId: 'generic-consumer-group',
      fromBeginning: true,
      autoCommit: true,
      ...options
    };
    
    this.isConnected = false;
    this.consumer = null;
    this.consumerId = null;
    this.kafkaService = new KafkaService(config.KAFKA.core);
    this.controller = null;
  }
  
  /**
   * Connect to Kafka and create the consumer
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
      
      console.log(`Creating Kafka consumer: ${this.options.name} in group ${this.options.groupId}`);
      const consumerResult = await this.kafkaService.createConsumer(
        this.options.groupId,
        this.options.name, 
        {
          fromBeginning: this.options.fromBeginning
        }
      );
      
      this.consumerId = consumerResult.id;
      this.consumer = consumerResult;
      this.isConnected = true;
      
      console.log(`Consumer created with ID: ${this.consumerId}`);
    } catch (error) {
      console.error('Failed to connect to Kafka:', error.message);
      throw error;
    }
  }
  
  /**
   * Disconnect the consumer and close Kafka connections
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    
    try {
      if (this.controller) {
        console.log('Stopping consumer...');
        await this.controller.stop();
      }
      
      console.log('Disconnecting consumer...');
      await this.kafkaService.closeConsumer(this.consumerId);
      await this.kafkaService.disconnect();
      this.isConnected = false;
      console.log('Consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting consumer:', error.message);
      throw error;
    }
  }
  
  /**
   * Subscribe to a Kafka topic
   * 
   * @param {string|Array<string>} topics - The topic(s) to subscribe to
   * @param {Object} options - Subscription options
   * @returns {Promise<void>}
   */
  async subscribe(topics, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const topicsArray = Array.isArray(topics) ? topics : [topics];
      
      console.log(`Subscribing to topics: ${topicsArray.join(', ')}`);
      
      const subscribeOptions = {
        fromBeginning: this.options.fromBeginning,
        ...options
      };
      
      for (const topic of topicsArray) {
        await this.kafkaService.subscribeConsumer(
          this.consumerId, 
          topic, 
          subscribeOptions
        );
      }
      
      console.log('Successfully subscribed to topics');
    } catch (error) {
      console.error('Failed to subscribe to topics:', error.message);
      throw error;
    }
  }
  
  /**
   * Start consuming messages with the provided message handler
   * 
   * @param {Function} messageHandler - Function to handle each message
   * @returns {Promise<Object>} - The consumer controller
   */
  async consume(messageHandler) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log('Starting consumer...');
      
      const consumerOptions = {
        eachMessage: async ({ topic, partition, message }) => {
          try {
            // Parse the message value
            let value = null;
            if (message.value) {
              try {
                value = JSON.parse(message.value.toString());
              } catch (e) {
                value = message.value.toString();
              }
            }
            
            // Parse the message key if present
            let key = null;
            if (message.key) {
              try {
                key = JSON.parse(message.key.toString());
              } catch (e) {
                key = message.key.toString();
              }
            }
            
            // Parse headers if present
            const headers = {};
            if (message.headers) {
              for (const [headerKey, headerValue] of Object.entries(message.headers)) {
                headers[headerKey] = headerValue ? headerValue.toString() : null;
              }
            }
            
            // Call the message handler with the parsed message
            await messageHandler({
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
              key,
              value,
              headers
            });
          } catch (error) {
            console.error('Error processing message:', error.message);
            console.error('Message:', message.value?.toString());
          }
        },
        autoCommit: this.options.autoCommit
      };
      
      this.controller = await this.kafkaService.startConsumer(
        this.consumerId,
        consumerOptions
      );
      
      console.log('Consumer started successfully');
      return this.controller;
    } catch (error) {
      console.error('Failed to start consuming:', error.message);
      throw error;
    }
  }
  
  /**
   * Pause consumption from specific topics
   * 
   * @param {string|Array<string>} topics - The topic(s) to pause
   * @returns {Promise<void>}
   */
  async pause(topics) {
    if (!this.controller) {
      throw new Error('Consumer not started');
    }
    
    try {
      const topicsArray = Array.isArray(topics) ? topics : [topics];
      console.log(`Pausing consumption from topics: ${topicsArray.join(', ')}`);
      
      await this.controller.pause(topicsArray.map(topic => ({ topic })));
      
      console.log('Successfully paused topics');
    } catch (error) {
      console.error('Failed to pause topics:', error.message);
      throw error;
    }
  }
  
  /**
   * Resume consumption from specific topics
   * 
   * @param {string|Array<string>} topics - The topic(s) to resume
   * @returns {Promise<void>}
   */
  async resume(topics) {
    if (!this.controller) {
      throw new Error('Consumer not started');
    }
    
    try {
      const topicsArray = Array.isArray(topics) ? topics : [topics];
      console.log(`Resuming consumption from topics: ${topicsArray.join(', ')}`);
      
      await this.controller.resume(topicsArray.map(topic => ({ topic })));
      
      console.log('Successfully resumed topics');
    } catch (error) {
      console.error('Failed to resume topics:', error.message);
      throw error;
    }
  }
}

module.exports = KafkaConsumer; 