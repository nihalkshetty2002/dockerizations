const KafkaService = require('../services/KafkaService');
const config = require('../config/config');

/**
 * A generic Kafka producer class with features for
 * sending messages to topics and handling common producer tasks
 */
class KafkaProducer {
  /**
   * Create a new Kafka producer
   * 
   * @param {Object} options - Configuration options for the producer
   */
  constructor(options = {}) {
    this.options = {
      name: 'generic-producer',
      ...options
    };
    
    this.isConnected = false;
    this.producer = null;
    this.producerId = null;
    this.kafkaService = new KafkaService(config.KAFKA.core);
  }
  
  /**
   * Connect to Kafka and create the producer
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
      
      console.log(`Creating Kafka producer: ${this.options.name}`);
      const producerResult = await this.kafkaService.createProducer(this.options.name);
      
      this.producerId = producerResult.id;
      this.producer = producerResult;
      this.isConnected = true;
      
      console.log(`Producer created with ID: ${this.producerId}`);
    } catch (error) {
      console.error('Failed to connect to Kafka:', error.message);
      throw error;
    }
  }
  
  /**
   * Disconnect the producer and close Kafka connections
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    
    try {
      console.log('Disconnecting producer...');
      await this.kafkaService.closeProducer(this.producerId);
      await this.kafkaService.disconnect();
      this.isConnected = false;
      console.log('Producer disconnected');
    } catch (error) {
      console.error('Error disconnecting producer:', error.message);
      throw error;
    }
  }
  
  /**
   * Send a message to a Kafka topic
   * 
   * @param {string} topic - The topic to send the message to
   * @param {any} message - The message to send (will be serialized to JSON)
   * @param {string} key - Optional message key
   * @param {Object} headers - Optional message headers
   * @returns {Promise<Object>} - Details about the sent message
   */
  async sendMessage(topic, message, key = null, headers = {}) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log(`Sending message to topic: ${topic}`);
      
      const messagePayload = {
        topic,
        value: typeof message === 'string' ? message : JSON.stringify(message),
        headers
      };
      
      if (key) {
        messagePayload.key = key;
      }
      
      const result = await this.kafkaService.produceMessage(
        this.producerId,
        messagePayload
      );
      
      console.log('Message sent successfully');
      return result;
    } catch (error) {
      console.error('Failed to send message:', error.message);
      throw error;
    }
  }
  
  /**
   * Send multiple messages to a Kafka topic in a batch
   * 
   * @param {string} topic - The topic to send the messages to
   * @param {Array<any>} messages - Array of messages to send
   * @returns {Promise<Object>} - Details about the sent batch
   */
  async sendBatch(topic, messages) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      console.log(`Sending batch of ${messages.length} messages to topic: ${topic}`);
      
      const messagePayloads = messages.map(msg => {
        if (typeof msg === 'object' && msg.value) {
          // If it's already in the right format with a value property
          return {
            topic,
            ...msg,
            value: typeof msg.value === 'string' ? msg.value : JSON.stringify(msg.value)
          };
        } else {
          // Simple value
          return {
            topic,
            value: typeof msg === 'string' ? msg : JSON.stringify(msg)
          };
        }
      });
      
      const result = await this.kafkaService.produceBatch(
        this.producerId,
        messagePayloads
      );
      
      console.log(`Batch of ${messages.length} messages sent successfully`);
      return result;
    } catch (error) {
      console.error('Failed to send message batch:', error.message);
      throw error;
    }
  }
}

module.exports = KafkaProducer; 