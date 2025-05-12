const { Kafka, logLevel } = require('kafkajs');

// Custom Error Classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class KafkaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'KafkaError';
  }
}

/**
 * KafkaService - Direct Kafka client using KafkaJS
 * Provides a more direct and performant way to interact with Kafka
 * as an alternative to the REST proxy approach
 */
class KafkaService {
  constructor(config) {
    this.config = config;
    this.bootstrapServers = config.bootstrapServers || 'localhost:9092';
    this.clientId = config.clientId || 'kafka-nodejs-client';
    
    // Create Kafka client
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: Array.isArray(this.bootstrapServers) 
        ? this.bootstrapServers 
        : this.bootstrapServers.split(','),
      ssl: config.ssl || false,
      sasl: config.sasl || undefined,
      connectionTimeout: config.connectionTimeout || 3000,
      requestTimeout: config.requestTimeout || 30000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      logLevel: config.logLevel || logLevel.INFO
    });
    
    // Create Admin client for metadata operations
    this.admin = this.kafka.admin();
    
    // Track active producers and consumers
    this.producers = new Map();
    this.consumers = new Map();
    
    // Default topic configuration
    this.defaultTopicConfig = {
      numPartitions: 1,
      replicationFactor: 1,
      configEntries: []
    };
  }
  
  /**
   * Connect to Kafka cluster
   */
  async connect() {
    try {
      await this.admin.connect();
      console.log('Connected to Kafka cluster');
    } catch (error) {
      throw new KafkaError(`Failed to connect to Kafka: ${error.message}`);
    }
  }
  
  /**
   * Disconnect from Kafka cluster
   */
  async disconnect() {
    try {
      await this.admin.disconnect();
      console.log('Disconnected from Kafka cluster');
      
      // Disconnect all producers
      for (const [id, producer] of this.producers.entries()) {
        await producer.disconnect();
        this.producers.delete(id);
      }
      
      // Disconnect all consumers
      for (const [id, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
        this.consumers.delete(id);
      }
    } catch (error) {
      throw new KafkaError(`Failed to disconnect from Kafka: ${error.message}`);
    }
  }
  
  // -------------------------------------------------------------------------
  // Topic Management
  // -------------------------------------------------------------------------
  
  /**
   * List all topics in the cluster
   * @returns {Promise<string[]>} List of topic names
   */
  async listTopics() {
    try {
      return await this.admin.listTopics();
    } catch (error) {
      throw new KafkaError(`Failed to list topics: ${error.message}`);
    }
  }
  
  /**
   * Get detailed metadata for specific topics
   * @param {string[]} topics List of topic names to fetch metadata for
   * @returns {Promise<Object>} Topic metadata
   */
  async getTopicMetadata(topics) {
    try {
      return await this.admin.fetchTopicMetadata({
        topics: topics
      });
    } catch (error) {
      throw new KafkaError(`Failed to fetch topic metadata: ${error.message}`);
    }
  }
  
  /**
   * Create a new topic
   * @param {string} topicName Name of the topic to create
   * @param {Object} config Topic configuration
   * @returns {Promise<void>}
   */
  async createTopic(topicName, config = {}) {
    if (!topicName || typeof topicName !== 'string') {
      throw new ValidationError('Topic name must be a non-empty string');
    }
    
    const topicConfig = {
      ...this.defaultTopicConfig,
      ...config
    };
    
    // Convert configEntries object to array if needed
    if (config.configEntries && !Array.isArray(config.configEntries)) {
      topicConfig.configEntries = Object.entries(config.configEntries).map(([key, value]) => ({
        name: key,
        value: value.toString()
      }));
    }
    
    try {
      await this.admin.createTopics({
        validateOnly: false,
        waitForLeaders: true,
        timeout: 10000,
        topics: [
          {
            topic: topicName,
            numPartitions: topicConfig.numPartitions,
            replicationFactor: topicConfig.replicationFactor,
            configEntries: topicConfig.configEntries
          }
        ]
      });
      
      return { success: true, message: `Topic ${topicName} created successfully` };
    } catch (error) {
      throw new KafkaError(`Failed to create topic ${topicName}: ${error.message}`);
    }
  }
  
  /**
   * Delete one or more topics
   * @param {string|string[]} topics Topic name(s) to delete
   * @returns {Promise<void>}
   */
  async deleteTopics(topics) {
    if (!topics) {
      throw new ValidationError('Topic name(s) must be provided');
    }
    
    const topicList = Array.isArray(topics) ? topics : [topics];
    
    try {
      await this.admin.deleteTopics({
        topics: topicList,
        timeout: 10000
      });
      
      return {
        success: true,
        message: `Topics deleted successfully: ${topicList.join(', ')}`
      };
    } catch (error) {
      throw new KafkaError(`Failed to delete topics: ${error.message}`);
    }
  }
  
  /**
   * Get topic configurations
   * @param {string|string[]} topics Topic name(s) to get configurations for
   * @returns {Promise<Object>} Topic configurations
   */
  async getTopicConfigs(topics) {
    if (!topics) {
      throw new ValidationError('Topic name(s) must be provided');
    }
    
    const topicList = Array.isArray(topics) ? topics : [topics];
    
    try {
      const resources = topicList.map(topic => ({
        type: 2, // ConfigResourceType.TOPIC
        name: topic
      }));
      
      return await this.admin.describeConfigs({
        resources,
        includeSynonyms: false,
        includeDocumentation: false
      });
    } catch (error) {
      throw new KafkaError(`Failed to get topic configs: ${error.message}`);
    }
  }
  
  /**
   * Update a topic's configuration
   * @param {string} topicName Name of the topic to update
   * @param {Object} configEntries Configuration key-value pairs to update
   * @returns {Promise<void>}
   */
  async updateTopicConfig(topicName, configEntries) {
    if (!topicName || typeof topicName !== 'string') {
      throw new ValidationError('Topic name must be a non-empty string');
    }
    
    if (!configEntries || typeof configEntries !== 'object') {
      throw new ValidationError('Configuration entries must be an object');
    }
    
    // Convert object to array format expected by KafkaJS
    const configResources = [
      {
        type: 2, // ConfigResourceType.TOPIC
        name: topicName,
        configEntries: Object.entries(configEntries).map(([name, value]) => ({
          name,
          value: value.toString()
        }))
      }
    ];
    
    try {
      await this.admin.alterConfigs({
        validateOnly: false,
        resources: configResources
      });
      
      return {
        success: true,
        message: `Topic ${topicName} configuration updated successfully`
      };
    } catch (error) {
      throw new KafkaError(`Failed to update topic configuration: ${error.message}`);
    }
  }
  
  // -------------------------------------------------------------------------
  // Consumer Group Management
  // -------------------------------------------------------------------------
  
  /**
   * List all consumer groups
   * @returns {Promise<Array>} List of consumer groups
   */
  async listConsumerGroups() {
    try {
      return await this.admin.listGroups();
    } catch (error) {
      throw new KafkaError(`Failed to list consumer groups: ${error.message}`);
    }
  }
  
  /**
   * Get detailed information about specific consumer groups
   * @param {string[]} groupIds Consumer group IDs to describe
   * @returns {Promise<Object>} Consumer group information
   */
  async describeConsumerGroups(groupIds) {
    try {
      return await this.admin.describeGroups(groupIds);
    } catch (error) {
      throw new KafkaError(`Failed to describe consumer groups: ${error.message}`);
    }
  }
  
  /**
   * Delete a consumer group
   * @param {string} groupId Consumer group ID to delete
   * @returns {Promise<void>}
   */
  async deleteConsumerGroup(groupId) {
    try {
      await this.admin.deleteGroups([groupId]);
      return {
        success: true,
        message: `Consumer group ${groupId} deleted successfully`
      };
    } catch (error) {
      throw new KafkaError(`Failed to delete consumer group: ${error.message}`);
    }
  }
  
  /**
   * Reset consumer group offsets for specified topics
   * @param {string} groupId Consumer group ID
   * @param {Object} topicPartitions Topics and partitions to reset
   * @param {string} offsetSpec Offset specification ('earliest', 'latest', or timestamp)
   * @returns {Promise<Object>} Result of the reset operation
   */
  async resetConsumerGroupOffsets(groupId, topicPartitions, offsetSpec = 'earliest') {
    try {
      let seekType;
      let seekValue;
      
      // Determine the seek type based on offsetSpec
      if (offsetSpec === 'earliest') {
        seekType = 'earliest';
      } else if (offsetSpec === 'latest') {
        seekType = 'latest';
      } else if (!isNaN(parseInt(offsetSpec, 10))) {
        seekType = 'timestamp';
        seekValue = parseInt(offsetSpec, 10);
      } else {
        throw new ValidationError('Invalid offset specification');
      }
      
      const result = await this.admin.resetOffsets({
        groupId,
        topic: topicPartitions.topic,
        partitions: topicPartitions.partitions,
        [seekType]: seekType === 'timestamp' ? seekValue : true
      });
      
      return {
        success: true,
        message: `Consumer group ${groupId} offsets reset successfully`,
        result
      };
    } catch (error) {
      throw new KafkaError(`Failed to reset consumer group offsets: ${error.message}`);
    }
  }
  
  // -------------------------------------------------------------------------
  // Producer
  // -------------------------------------------------------------------------
  
  /**
   * Create a new producer instance
   * @param {string} id Optional ID for the producer
   * @param {Object} config Producer configuration
   * @returns {Promise<string>} Producer ID
   */
  async createProducer(id = null, config = {}) {
    const producerId = id || `producer-${Date.now()}`;
    
    // Check if producer with this ID already exists
    if (this.producers.has(producerId)) {
      throw new ValidationError(`Producer with ID ${producerId} already exists`);
    }
    
    try {
      const producer = this.kafka.producer({
        allowAutoTopicCreation: config.allowAutoTopicCreation || false,
        transactionTimeout: config.transactionTimeout || 60000,
        ...config
      });
      
      await producer.connect();
      this.producers.set(producerId, producer);
      
      return producerId;
    } catch (error) {
      throw new KafkaError(`Failed to create producer: ${error.message}`);
    }
  }
  
  /**
   * Send messages to a Kafka topic
   * @param {string} producerId ID of the producer to use
   * @param {string} topic Topic to send messages to
   * @param {Array} messages Array of messages to send
   * @param {Object} options Additional options
   * @returns {Promise<Object>} Result of the send operation
   */
  async sendMessages(producerId, topic, messages, options = {}) {
    const producer = this.producers.get(producerId);
    if (!producer) {
      throw new ValidationError(`Producer with ID ${producerId} not found`);
    }
    
    if (!topic || typeof topic !== 'string') {
      throw new ValidationError('Topic must be a non-empty string');
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ValidationError('Messages must be a non-empty array');
    }
    
    // Format messages for KafkaJS
    const formattedMessages = messages.map(msg => {
      const message = {
        value: typeof msg.value === 'string' ? msg.value : JSON.stringify(msg.value),
      };
      
      if (msg.key) {
        message.key = typeof msg.key === 'string' ? msg.key : JSON.stringify(msg.key);
      }
      
      if (msg.partition !== undefined) {
        message.partition = msg.partition;
      }
      
      if (msg.timestamp) {
        message.timestamp = msg.timestamp;
      }
      
      if (msg.headers) {
        message.headers = msg.headers;
      }
      
      return message;
    });
    
    try {
      const result = await producer.send({
        topic,
        messages: formattedMessages,
        acks: options.acks || -1, // Wait for all replicas by default
        timeout: options.timeout || 30000,
        compression: options.compression || 0 // None by default
      });
      
      return {
        success: true,
        topic,
        messageCount: formattedMessages.length,
        result
      };
    } catch (error) {
      throw new KafkaError(`Failed to send messages to topic ${topic}: ${error.message}`);
    }
  }
  
  /**
   * Close a producer
   * @param {string} producerId ID of the producer to close
   * @returns {Promise<Object>} Result of the operation
   */
  async closeProducer(producerId) {
    const producer = this.producers.get(producerId);
    if (!producer) {
      throw new ValidationError(`Producer with ID ${producerId} not found`);
    }
    
    try {
      await producer.disconnect();
      this.producers.delete(producerId);
      
      return {
        success: true,
        message: `Producer ${producerId} closed successfully`
      };
    } catch (error) {
      throw new KafkaError(`Failed to close producer: ${error.message}`);
    }
  }
  
  // -------------------------------------------------------------------------
  // Consumer
  // -------------------------------------------------------------------------
  
  /**
   * Create a new consumer instance
   * @param {string} groupId Consumer group ID
   * @param {string} id Optional ID for the consumer
   * @param {Object} config Consumer configuration
   * @returns {Promise<string>} Consumer ID
   */
  async createConsumer(groupId, id = null, config = {}) {
    if (!groupId || typeof groupId !== 'string') {
      throw new ValidationError('Consumer group ID must be a non-empty string');
    }
    
    const consumerId = id || `consumer-${Date.now()}`;
    
    // Check if consumer with this ID already exists
    if (this.consumers.has(consumerId)) {
      throw new ValidationError(`Consumer with ID ${consumerId} already exists`);
    }
    
    try {
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
        maxBytesPerPartition: config.maxBytesPerPartition || 1048576, // 1MB
        readUncommitted: config.readUncommitted || false,
        ...config
      });
      
      await consumer.connect();
      
      // Store consumer instance and metadata
      this.consumers.set(consumerId, {
        instance: consumer,
        groupId,
        subscriptions: [],
        running: false
      });
      
      return {
        id: consumerId,
        groupId
      };
    } catch (error) {
      throw new KafkaError(`Failed to create consumer: ${error.message}`);
    }
  }
  
  /**
   * Subscribe a consumer to topics
   * @param {string} consumerId ID of the consumer
   * @param {string|string[]} topics Topic(s) to subscribe to
   * @param {Object} options Subscription options
   * @returns {Promise<Object>} Result of the subscription
   */
  async subscribeConsumer(consumerId, topics, options = {}) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new ValidationError(`Consumer with ID ${consumerId} not found`);
    }
    
    const consumer = consumerData.instance;
    const topicList = Array.isArray(topics) ? topics : [topics];
    
    if (topicList.length === 0) {
      throw new ValidationError('At least one topic must be provided');
    }
    
    const fromBeginning = options.fromBeginning === undefined ? true : options.fromBeginning;
    
    try {
      // Subscribe to each topic
      for (const topic of topicList) {
        await consumer.subscribe({
          topic,
          fromBeginning
        });
        
        // Add to subscriptions if not already present
        if (!consumerData.subscriptions.includes(topic)) {
          consumerData.subscriptions.push(topic);
        }
      }
      
      // Update consumer data
      this.consumers.set(consumerId, consumerData);
      
      return {
        id: consumerId,
        groupId: consumerData.groupId,
        topics: consumerData.subscriptions
      };
    } catch (error) {
      throw new KafkaError(`Failed to subscribe consumer to topics: ${error.message}`);
    }
  }
  
  /**
   * Start consuming messages
   * @param {string} consumerId ID of the consumer
   * @param {Object} options Consumption options
   * @returns {Promise<Object>} Consumer controller
   */
  async startConsumer(consumerId, options = {}) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new ValidationError(`Consumer with ID ${consumerId} not found`);
    }
    
    const consumer = consumerData.instance;
    
    if (consumerData.subscriptions.length === 0) {
      throw new ValidationError(`Consumer ${consumerId} has no topic subscriptions`);
    }
    
    if (consumerData.running) {
      return {
        message: `Consumer ${consumerId} is already running`,
        isRunning: true
      };
    }
    
    // Options
    const {
      eachMessage = null,
      eachBatch = null,
      autoCommit = true,
      batchSize = 100,
      maxWaitTimeInMs = 1000
    } = options;
    
    try {
      const controller = {
        isRunning: true,
        pause: () => {
          consumer.pause(consumerData.subscriptions.map(topic => ({ topic })));
          controller.isRunning = false;
        },
        resume: () => {
          consumer.resume(consumerData.subscriptions.map(topic => ({ topic })));
          controller.isRunning = true;
        },
        stop: async () => {
          controller.isRunning = false;
          await this.stopConsumer(consumerId);
        },
        getSubscriptions: () => {
          return consumerData.subscriptions;
        }
      };
      
      // Choose run strategy based on options
      if (eachBatch && typeof eachBatch === 'function') {
        // Batch processing mode
        await consumer.run({
          eachBatch: async ({ batch, isRunning, isStale, heartbeat, resolveOffset }) => {
            if (!isRunning() || isStale()) return;
            await eachBatch(batch);
            
            if (autoCommit) {
              // Commit the last offset in the batch
              const lastOffset = batch.messages[batch.messages.length - 1].offset;
              resolveOffset(lastOffset);
            }
            
            await heartbeat();
          },
          autoCommit,
          partitionsConsumedConcurrently: options.concurrency || 1,
          batchSize,
          maxWaitTimeInMs
        });
      } else if (eachMessage && typeof eachMessage === 'function') {
        // Message-by-message processing mode
        await consumer.run({
          eachMessage: async ({ topic, partition, message, heartbeat }) => {
            // Parse message value as JSON if possible
            let value;
            try {
              value = JSON.parse(message.value.toString());
            } catch (e) {
              value = message.value.toString();
            }
            
            // Parse key as JSON if possible
            let key;
            try {
              key = message.key ? JSON.parse(message.key.toString()) : null;
            } catch (e) {
              key = message.key ? message.key.toString() : null;
            }
            
            await eachMessage({
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
              key,
              value,
              headers: message.headers
            });
            
            await heartbeat();
          },
          autoCommit,
          partitionsConsumedConcurrently: options.concurrency || 1
        });
      } else {
        throw new ValidationError('Either eachMessage or eachBatch callback must be provided');
      }
      
      // Update consumer state
      consumerData.running = true;
      this.consumers.set(consumerId, consumerData);
      
      return controller;
    } catch (error) {
      throw new KafkaError(`Failed to start consumer: ${error.message}`);
    }
  }
  
  /**
   * Stop a running consumer
   * @param {string} consumerId ID of the consumer to stop
   * @returns {Promise<Object>} Result of the operation
   */
  async stopConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new ValidationError(`Consumer with ID ${consumerId} not found`);
    }
    
    const consumer = consumerData.instance;
    
    try {
      await consumer.stop();
      
      // Update consumer state
      consumerData.running = false;
      this.consumers.set(consumerId, consumerData);
      
      return {
        success: true,
        message: `Consumer ${consumerId} stopped successfully`
      };
    } catch (error) {
      throw new KafkaError(`Failed to stop consumer: ${error.message}`);
    }
  }
  
  /**
   * Commit offsets for a consumer
   * @param {string} consumerId ID of the consumer
   * @param {Array} offsets Offsets to commit
   * @returns {Promise<Object>} Result of the operation
   */
  async commitOffsets(consumerId, offsets) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new ValidationError(`Consumer with ID ${consumerId} not found`);
    }
    
    const consumer = consumerData.instance;
    
    try {
      await consumer.commitOffsets(offsets);
      
      return {
        success: true,
        message: `Offsets committed successfully for consumer ${consumerId}`
      };
    } catch (error) {
      throw new KafkaError(`Failed to commit offsets: ${error.message}`);
    }
  }
  
  /**
   * Close a consumer
   * @param {string} consumerId ID of the consumer to close
   * @returns {Promise<Object>} Result of the operation
   */
  async closeConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new ValidationError(`Consumer with ID ${consumerId} not found`);
    }
    
    const consumer = consumerData.instance;
    
    try {
      // Stop if running
      if (consumerData.running) {
        await consumer.stop();
      }
      
      await consumer.disconnect();
      this.consumers.delete(consumerId);
      
      return {
        success: true,
        message: `Consumer ${consumerId} closed successfully`
      };
    } catch (error) {
      throw new KafkaError(`Failed to close consumer: ${error.message}`);
    }
  }
}

module.exports = KafkaService; 