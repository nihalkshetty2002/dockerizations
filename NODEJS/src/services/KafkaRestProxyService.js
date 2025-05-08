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
}

module.exports = KafkaRestProxyService;