/**
 * Entry point for Kafka operations
 * Exports all Kafka related functionality
 */
require('dotenv').config();
const config = require('./config/config');

// Import Kafka producers and consumers
const KafkaProducer = require('./producers/kafka-producer');
const KafkaConsumer = require('./consumers/kafka-consumer');

// Import Kafka services
const KafkaService = require('./services/KafkaService');
const KafkaRestProxyService = require('./services/KafkaRestProxyService');
const SchemaRegistryService = require('./services/SchemaRegistryService');
const KafkaConnectService = require('./services/KafkaConnectService');
const KsqlDBService = require('./services/KsqlDBService');
const ControlCenterService = require('./services/ControlCenterService');

// Import connectors
const BaseConnector = require('./connectors/base-connector');
const MongoDBConnector = require('./connectors/mongodb-connector');

// Import utils
const KafkaAdmin = require('./utils/kafka-admin');

/**
 * Create a new Kafka producer instance with the provided options
 * 
 * @param {Object} options - Producer options
 * @returns {KafkaProducer} - A new Kafka producer instance
 */
function createProducer(options = {}) {
  return new KafkaProducer(options);
}

/**
 * Create a new Kafka consumer instance with the provided options
 * 
 * @param {Object} options - Consumer options
 * @returns {KafkaConsumer} - A new Kafka consumer instance
 */
function createConsumer(options = {}) {
  return new KafkaConsumer(options);
}

/**
 * Create a new MongoDB connector
 * 
 * @param {Object} options - MongoDB connector options
 * @returns {MongoDBConnector} - A new MongoDB connector instance
 */
function createMongoDBConnector(options = {}) {
  return new MongoDBConnector(options);
}

/**
 * Get the configuration
 * 
 * @returns {Object} - The current configuration
 */
function getConfig() {
  return config;
}

/**
 * Create a Kafka admin utility instance
 * 
 * @returns {KafkaAdmin} - A new Kafka admin instance
 */
function createAdmin() {
  return new KafkaAdmin(config.KAFKA.core);
}

// Export all the functionality
module.exports = {
  // Core functionality
  createProducer,
  createConsumer,
  createMongoDBConnector,
  createAdmin,
  getConfig,
  
  // Classes for advanced usage
  KafkaProducer,
  KafkaConsumer,
  KafkaService,
  KafkaRestProxyService,
  SchemaRegistryService,
  KafkaConnectService,
  KsqlDBService,
  ControlCenterService,
  BaseConnector,
  MongoDBConnector,
  KafkaAdmin,
  
  // Configuration
  config
}; 