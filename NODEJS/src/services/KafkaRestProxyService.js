const HttpClient = require('../utils/HttpClient');

// Custom Error Classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ApiError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

class KafkaRestProxyService {
  constructor(config) {
    this.httpClient = new HttpClient(config.baseUrl, config);
    this.defaultProducerConfig = {
      format: 'json',
      partition: null,
      key: null,
    };
    this.defaultConsumerConfig = {
      format: 'json',
      autoOffsetReset: 'earliest',
      groupName: 'default-group',
      consumerName: 'consumer-1',
      timeout: 1000,
      interval: 1000,
    };
    // Initialize cluster ID
    this.clusterID = config.clusterID || null;
    this.activeConsumers = new Map(); // Store active consumer instances
  }

  // Initialize cluster ID by fetching from /v3/clusters if not provided
  async initialize() {
    if (!this.clusterID) {
      try {
        const response = await this.httpClient.get('/v3/clusters');
        const clusters = response.data;
        if (!clusters || clusters.length === 0) {
          throw new ApiError('No Kafka clusters found');
        }
        if (clusters.length === 1) {
          this.clusterID = clusters[0].cluster_id;
        } else {
          throw new ApiError('Multiple clusters found. Please specify a clusterID in config');
        }
      } catch (error) {
        throw new ApiError(`Failed to initialize cluster ID: ${error.message}`);
      }
    }
  }

  // Validation Helpers
  #validateString(value, name, allowEmpty = false) {
    if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
      throw new ValidationError(`${name} must be a non-empty string`);
    }
  }

  #validateNumber(value, name, min = null) {
    if (typeof value !== 'number' || isNaN(value) || (min !== null && value < min)) {
      throw new ValidationError(`${name} must be a number${min !== null ? ` >= ${min}` : ''}`);
    }
  }

  #validateObject(value, name) {
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
      throw new ValidationError(`${name} must be a valid object`);
    }
  }

  #validateArray(value, name, allowEmpty = false) {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
      throw new ValidationError(`${name} must be a non-empty array`);
    }
  }

  #validateConfig(config, allowedKeys, name) {
    this.#validateObject(config, name);
    if (config) {
      Object.keys(config).forEach(key => {
        if (!allowedKeys.includes(key)) {
          throw new ValidationError(`Invalid ${name} key: ${key}`);
        }
      });
    }
  }

  // Topic Management
  async createTopic(topicName, config = {}) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    this.#validateConfig(config, ['partitions', 'replicationFactor', 'configs'], 'config');
    
    const { partitions = 1, replicationFactor = 1, configs = {} } = config;
    this.#validateNumber(partitions, 'partitions', 1);
    this.#validateNumber(replicationFactor, 'replicationFactor', 1);
    this.#validateObject(configs, 'configs');

    try {
      const payload = {
        topic_name: topicName,
        partitions_count: partitions,
        replication_factor: replicationFactor,
        configs: Object.entries(configs).map(([name, value]) => ({ name, value }))
      };
      return await this.httpClient.post(`/v3/clusters/${this.clusterID}/topics`, payload);
    } catch (error) {
      throw new ApiError(`Failed to create topic ${topicName}: ${error.message}`);
    }
  }

  async listTopics() {
    await this.initialize();
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/topics`);
    } catch (error) {
      throw new ApiError(`Failed to list topics: ${error.message}`);
    }
  }

  async getTopic(topicName) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/topics/${topicName}`);
    } catch (error) {
      throw new ApiError(`Failed to get topic ${topicName}: ${error.message}`);
    }
  }

  async deleteTopic(topicName) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    try {
      return await this.httpClient.delete(`/v3/clusters/${this.clusterID}/topics/${topicName}`);
    } catch (error) {
      throw new ApiError(`Failed to delete topic ${topicName}: ${error.message}`);
    }
  }

  async updateTopicConfig(topicName, configs) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    this.#validateObject(configs, 'configs');
    
    try {
      const configItems = Object.entries(configs).map(([name, value]) => ({ 
        name, 
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }));
      
      const requests = configItems.map(config => ({
        data: {
          name: config.name,
          value: config.value
        }
      }));
      
      return await this.httpClient.patch(
        `/v3/clusters/${this.clusterID}/topics/${topicName}/configs`,
        { data: requests }
      );
    } catch (error) {
      throw new ApiError(`Failed to update topic config for ${topicName}: ${error.message}`);
    }
  }

  // Producer
  async produceMessage(topicName, value, config = {}) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    this.#validateObject(value, 'value');
    this.#validateConfig(config, ['format', 'partition', 'key'], 'config');

    const { format, partition, key } = { ...this.defaultProducerConfig, ...config };

    try {
      const payload = {
        value: value,
        partition_id: partition,
        key: key,
        headers: []
      };
      return await this.httpClient.post(
        `/v3/clusters/${this.clusterID}/topics/${topicName}/records`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      throw new ApiError(`Failed to produce message to ${topicName}: ${error.message}`);
    }
  }
  
  async produceMessages(topicName, messages) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    this.#validateArray(messages, 'messages');
    
    try {
      const requests = messages.map(msg => {
        // Validate each message
        if (!msg.value) {
          throw new ValidationError('Each message must have a value');
        }
        
        return {
          value: msg.value,
          partition_id: msg.partition || null,
          key: msg.key || null,
          headers: msg.headers || []
        };
      });
      
      const results = [];
      
      // Send messages in batches (REST Proxy doesn't have a batch endpoint, so we send them sequentially)
      for (const request of requests) {
        const result = await this.httpClient.post(
          `/v3/clusters/${this.clusterID}/topics/${topicName}/records`,
          request,
          { headers: { 'Content-Type': 'application/json' } }
        );
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw new ApiError(`Failed to produce messages to ${topicName}: ${error.message}`);
    }
  }

  // Consumer Groups
  async listConsumerGroups() {
    await this.initialize();
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/consumer-groups`);
    } catch (error) {
      throw new ApiError(`Failed to list consumer groups: ${error.message}`);
    }
  }

  async getConsumerGroup(groupId) {
    await this.initialize();
    this.#validateString(groupId, 'groupId');
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/consumer-groups/${groupId}`);
    } catch (error) {
      throw new ApiError(`Failed to get consumer group ${groupId}: ${error.message}`);
    }
  }

  async getConsumerGroupLag(groupId) {
    await this.initialize();
    this.#validateString(groupId, 'groupId');
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/consumer-groups/${groupId}/lag`);
    } catch (error) {
      throw new ApiError(`Failed to get consumer group lag for ${groupId}: ${error.message}`);
    }
  }
  
  async deleteConsumerGroup(groupId) {
    await this.initialize();
    this.#validateString(groupId, 'groupId');
    try {
      return await this.httpClient.delete(`/v3/clusters/${this.clusterID}/consumer-groups/${groupId}`);
    } catch (error) {
      throw new ApiError(`Failed to delete consumer group ${groupId}: ${error.message}`);
    }
  }

  // Partitions
  async listPartitions(topicName) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/topics/${topicName}/partitions`);
    } catch (error) {
      throw new ApiError(`Failed to list partitions for topic ${topicName}: ${error.message}`);
    }
  }

  async getPartition(topicName, partitionId) {
    await this.initialize();
    this.#validateString(topicName, 'topicName');
    this.#validateNumber(partitionId, 'partitionId', 0);
    try {
      return await this.httpClient.get(`/v3/clusters/${this.clusterID}/topics/${topicName}/partitions/${partitionId}`);
    } catch (error) {
      throw new ApiError(`Failed to get partition ${partitionId} for topic ${topicName}: ${error.message}`);
    }
  }
  
  // Consumer Management
  async createConsumer(groupId, config = {}) {
    await this.initialize();
    this.#validateString(groupId, 'groupId');
    this.#validateConfig(config, ['name', 'format', 'autoOffsetReset'], 'config');
    
    const { 
      name = `consumer-${Date.now()}`,
      format = 'json',
      autoOffsetReset = 'earliest'
    } = config;
    
    try {
      const payload = {
        name,
        format,
        'auto.offset.reset': autoOffsetReset,
        'auto.commit.enable': 'true'
      };
      
      const response = await this.httpClient.post(
        `/v3/clusters/${this.clusterID}/consumer-groups/${groupId}/consumers`,
        payload
      );
      
      // Store consumer ID for future operations
      const consumerId = response.consumer_id || response.id;
      const consumerInstance = {
        id: consumerId,
        groupId,
        name,
        base_uri: response.base_uri,
        subscriptions: []
      };
      
      this.activeConsumers.set(consumerId, consumerInstance);
      
      return {
        ...response,
        id: consumerId,
        groupId
      };
    } catch (error) {
      throw new ApiError(`Failed to create consumer in group ${groupId}: ${error.message}`);
    }
  }
  
  async subscribeConsumer(consumerId, topics) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    
    if (!Array.isArray(topics)) {
      topics = [topics]; // Convert single topic to array
    }
    
    topics.forEach((topic, index) => {
      this.#validateString(topic, `topics[${index}]`);
    });
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    try {
      const payload = {
        topics
      };
      
      const response = await this.httpClient.post(
        `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}/subscription`,
        payload
      );
      
      // Update subscriptions
      consumer.subscriptions = [...new Set([...consumer.subscriptions, ...topics])];
      this.activeConsumers.set(consumerId, consumer);
      
      return {
        consumerId,
        groupId: consumer.groupId,
        topics: consumer.subscriptions
      };
    } catch (error) {
      throw new ApiError(`Failed to subscribe consumer ${consumerId} to topics: ${error.message}`);
    }
  }
  
  async unsubscribeConsumer(consumerId, topics = null) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    try {
      if (topics) {
        if (!Array.isArray(topics)) {
          topics = [topics]; // Convert single topic to array
        }
        
        // Partial unsubscribe - remove only specified topics
        const currentSubscriptions = new Set(consumer.subscriptions);
        topics.forEach(topic => currentSubscriptions.delete(topic));
        
        // Re-subscribe to remaining topics (REST Proxy doesn't have partial unsubscribe)
        if (currentSubscriptions.size > 0) {
          const remainingTopics = Array.from(currentSubscriptions);
          await this.subscribeConsumer(consumerId, remainingTopics);
        } else {
          // No topics left, unsubscribe from all
          await this.httpClient.delete(
            `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}/subscription`
          );
        }
        
        // Update stored subscriptions
        consumer.subscriptions = Array.from(currentSubscriptions);
      } else {
        // Complete unsubscribe from all topics
        await this.httpClient.delete(
          `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}/subscription`
        );
        consumer.subscriptions = [];
      }
      
      this.activeConsumers.set(consumerId, consumer);
      
      return {
        consumerId,
        groupId: consumer.groupId,
        topics: consumer.subscriptions
      };
    } catch (error) {
      throw new ApiError(`Failed to unsubscribe consumer ${consumerId}: ${error.message}`);
    }
  }
  
  async consumeMessages(consumerId, config = {}) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    this.#validateConfig(config, ['maxResults', 'timeout'], 'config');
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    if (consumer.subscriptions.length === 0) {
      throw new ApiError(`Consumer ${consumerId} has no topic subscriptions`);
    }
    
    const { 
      maxResults = 100,
      timeout = 1000
    } = config;
    
    try {
      const response = await this.httpClient.get(
        `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}/records`,
        {
          params: {
            'max_results': maxResults,
            'timeout': timeout
          }
        }
      );
      
      return response;
    } catch (error) {
      throw new ApiError(`Failed to consume messages for consumer ${consumerId}: ${error.message}`);
    }
  }
  
  async closeConsumer(consumerId) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    try {
      await this.httpClient.delete(
        `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}`
      );
      
      // Remove from active consumers
      this.activeConsumers.delete(consumerId);
      
      return { success: true, message: `Consumer ${consumerId} closed successfully` };
    } catch (error) {
      throw new ApiError(`Failed to close consumer ${consumerId}: ${error.message}`);
    }
  }
  
  // Consumer Stream - allows continuous message consumption
  async consumeStream(consumerId, config = {}) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    this.#validateConfig(config, ['maxResults', 'pollInterval', 'onMessage', 'onError', 'autoCommit'], 'config');
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    if (consumer.subscriptions.length === 0) {
      throw new ApiError(`Consumer ${consumerId} has no topic subscriptions`);
    }
    
    const { 
      maxResults = 10,
      pollInterval = 1000, // ms
      onMessage,
      onError,
      autoCommit = true
    } = config;
    
    if (typeof onMessage !== 'function') {
      throw new ValidationError('onMessage must be a function');
    }
    
    if (onError && typeof onError !== 'function') {
      throw new ValidationError('onError must be a function if provided');
    }
    
    // Create a control object to manage the streaming process
    const streamController = {
      isRunning: true,
      pause: function() { this.isRunning = false; },
      resume: function() { this.isRunning = true; },
      stop: function() { this.isRunning = false; this.isStopped = true; },
      isStopped: false
    };
    
    // Start polling loop
    this.#pollMessages(
      consumerId, 
      consumer.groupId, 
      maxResults, 
      pollInterval, 
      onMessage, 
      onError, 
      autoCommit, 
      streamController
    );
    
    return streamController;
  }
  
  async #pollMessages(
    consumerId, 
    groupId, 
    maxResults, 
    pollInterval, 
    onMessage, 
    onError, 
    autoCommit, 
    controller
  ) {
    while (!controller.isStopped) {
      if (controller.isRunning) {
        try {
          const messages = await this.httpClient.get(
            `/v3/clusters/${this.clusterID}/consumer-groups/${groupId}/consumers/${consumerId}/records`,
            {
              params: {
                'max_results': maxResults,
                'timeout': Math.min(500, pollInterval / 2) // Keep timeout lower than poll interval
              }
            }
          );
          
          if (messages && messages.length > 0) {
            onMessage(messages);
            
            if (autoCommit) {
              try {
                // Get offsets to commit from the messages
                const offsetsToCommit = this.#getOffsetsFromMessages(messages);
                if (offsetsToCommit.length > 0) {
                  await this.commitOffsets(consumerId, offsetsToCommit);
                }
              } catch (commitError) {
                if (onError) {
                  onError(new Error(`Failed to auto-commit offsets: ${commitError.message}`));
                }
              }
            }
          }
        } catch (error) {
          if (onError) {
            onError(error);
          }
        }
      }
      
      // Wait for the next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    // Clean up when stopped
    try {
      await this.closeConsumer(consumerId);
    } catch (error) {
      if (onError) {
        onError(new Error(`Failed to close consumer on stream end: ${error.message}`));
      }
    }
  }
  
  #getOffsetsFromMessages(messages) {
    const offsetMap = new Map();
    
    // Group by topic-partition and find the highest offset
    for (const message of messages) {
      const key = `${message.topic_name}-${message.partition_id}`;
      const currentOffset = offsetMap.get(key);
      
      if (!currentOffset || message.offset > currentOffset.offset) {
        offsetMap.set(key, {
          topic_name: message.topic_name,
          partition_id: message.partition_id,
          offset: message.offset
        });
      }
    }
    
    // Convert the map values to an array and add 1 to each offset (to commit the next position)
    return Array.from(offsetMap.values()).map(item => ({
      ...item,
      offset: parseInt(item.offset, 10) + 1
    }));
  }
  
  async commitOffsets(consumerId, offsets) {
    await this.initialize();
    this.#validateString(consumerId, 'consumerId');
    this.#validateArray(offsets, 'offsets');
    
    const consumer = this.activeConsumers.get(consumerId);
    if (!consumer) {
      throw new ApiError(`Consumer ${consumerId} not found or not created by this instance`);
    }
    
    try {
      const payload = { offsets };
      
      return await this.httpClient.post(
        `/v3/clusters/${this.clusterID}/consumer-groups/${consumer.groupId}/consumers/${consumerId}/offsets`,
        payload
      );
    } catch (error) {
      throw new ApiError(`Failed to commit offsets for consumer ${consumerId}: ${error.message}`);
    }
  }
  
  // ACL Management
  async listAcls(filter = {}) {
    await this.initialize();
    try {
      const queryParams = new URLSearchParams();
      
      if (filter.resourceType) queryParams.append('resource_type', filter.resourceType);
      if (filter.resourceName) queryParams.append('resource_name', filter.resourceName);
      if (filter.patternType) queryParams.append('pattern_type', filter.patternType);
      if (filter.principal) queryParams.append('principal', filter.principal);
      if (filter.host) queryParams.append('host', filter.host);
      if (filter.operation) queryParams.append('operation', filter.operation);
      if (filter.permission) queryParams.append('permission', filter.permission);
      
      const url = `/v3/clusters/${this.clusterID}/acls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await this.httpClient.get(url);
    } catch (error) {
      throw new ApiError(`Failed to list ACLs: ${error.message}`);
    }
  }
  
  async createAcl(aclConfig) {
    await this.initialize();
    this.#validateObject(aclConfig, 'aclConfig');
    
    const requiredFields = ['resourceType', 'resourceName', 'patternType', 'principal', 'host', 'operation', 'permission'];
    requiredFields.forEach(field => {
      if (!aclConfig[field]) {
        throw new ValidationError(`Field ${field} is required in aclConfig`);
      }
    });
    
    try {
      const payload = {
        resource_type: aclConfig.resourceType,
        resource_name: aclConfig.resourceName,
        pattern_type: aclConfig.patternType,
        principal: aclConfig.principal,
        host: aclConfig.host,
        operation: aclConfig.operation,
        permission: aclConfig.permission
      };
      
      return await this.httpClient.post(`/v3/clusters/${this.clusterID}/acls`, payload);
    } catch (error) {
      throw new ApiError(`Failed to create ACL: ${error.message}`);
    }
  }
  
  async deleteAcl(aclConfig) {
    await this.initialize();
    this.#validateObject(aclConfig, 'aclConfig');
    
    try {
      const queryParams = new URLSearchParams();
      
      if (aclConfig.resourceType) queryParams.append('resource_type', aclConfig.resourceType);
      if (aclConfig.resourceName) queryParams.append('resource_name', aclConfig.resourceName);
      if (aclConfig.patternType) queryParams.append('pattern_type', aclConfig.patternType);
      if (aclConfig.principal) queryParams.append('principal', aclConfig.principal);
      if (aclConfig.host) queryParams.append('host', aclConfig.host);
      if (aclConfig.operation) queryParams.append('operation', aclConfig.operation);
      if (aclConfig.permission) queryParams.append('permission', aclConfig.permission);
      
      const url = `/v3/clusters/${this.clusterID}/acls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await this.httpClient.delete(url);
    } catch (error) {
      throw new ApiError(`Failed to delete ACL: ${error.message}`);
    }
  }
}

module.exports = KafkaRestProxyService;