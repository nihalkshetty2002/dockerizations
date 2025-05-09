const KafkaConnectService = require('../services/KafkaConnectService');
const config = require('../config/config');

/**
 * Base Connector class that provides common connector functionality
 * All specific connectors should extend this class
 */
class BaseConnector {
  /**
   * Create a new connector instance
   * 
   * @param {string} name - The name of the connector
   * @param {Object} config - Configuration for the connector
   */
  constructor(name, connectorConfig = {}) {
    this.connectorName = name;
    this.connectorConfig = connectorConfig;
    this.connectService = new KafkaConnectService(config.KAFKA.connect);
  }

  /**
   * Checks if the connector exists
   * 
   * @returns {Promise<boolean>}
   */
  async exists() {
    try {
      const connector = await this.connectService.getConnector(this.connectorName);
      return Boolean(connector);
    } catch (error) {
      return false;
    }
  }

  /**
   * List all available connectors
   * 
   * @returns {Promise<Array>}
   */
  async listConnectors() {
    try {
      console.log('Listing available connectors:');
      const connectors = await this.connectService.listConnectors();
      return connectors;
    } catch (error) {
      console.error('Failed to list connectors:', error.message);
      throw error;
    }
  }

  /**
   * Delete the connector if it exists
   * 
   * @returns {Promise<boolean>}
   */
  async deleteIfExists() {
    try {
      const exists = await this.exists();
      if (exists) {
        console.log(`Connector '${this.connectorName}' already exists, removing...`);
        await this.connectService.deleteConnector(this.connectorName);
        console.log('Existing connector removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting connector ${this.connectorName}:`, error.message);
      return false;
    }
  }

  /**
   * Creates the connector with the given configuration
   * 
   * @returns {Promise<Object>}
   */
  async create() {
    try {
      console.log(`Creating connector: ${this.connectorName}`);
      
      // Delete connector if it already exists
      await this.deleteIfExists();
      
      // Merge the name into the config
      const connectorConfig = {
        name: this.connectorName,
        ...this.connectorConfig
      };
      
      console.log('Connector configuration:');
      console.log(JSON.stringify(connectorConfig, null, 2));
      
      const result = await this.connectService.createConnector(connectorConfig);
      console.log(`Connector ${this.connectorName} created successfully!`);
      
      return result;
    } catch (error) {
      console.error('Failed to create connector:', error.message);
      if (error.response && error.response.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Gets the status of the connector
   * 
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      console.log(`Checking status of connector: ${this.connectorName}`);
      return await this.connectService.getConnectorStatus(this.connectorName);
    } catch (error) {
      console.error('Failed to check connector status:', error.message);
      throw error;
    }
  }

  /**
   * Pauses the connector
   * 
   * @returns {Promise<Object>}
   */
  async pause() {
    try {
      console.log(`Pausing connector: ${this.connectorName}`);
      return await this.connectService.pauseConnector(this.connectorName);
    } catch (error) {
      console.error('Failed to pause connector:', error.message);
      throw error;
    }
  }

  /**
   * Resumes the connector
   * 
   * @returns {Promise<Object>}
   */
  async resume() {
    try {
      console.log(`Resuming connector: ${this.connectorName}`);
      return await this.connectService.resumeConnector(this.connectorName);
    } catch (error) {
      console.error('Failed to resume connector:', error.message);
      throw error;
    }
  }

  /**
   * Restarts the connector
   * 
   * @returns {Promise<Object>}
   */
  async restart() {
    try {
      console.log(`Restarting connector: ${this.connectorName}`);
      return await this.connectService.restartConnector(this.connectorName);
    } catch (error) {
      console.error('Failed to restart connector:', error.message);
      throw error;
    }
  }
}

module.exports = BaseConnector; 