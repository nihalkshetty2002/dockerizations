const HttpClient = require('../utils/HttpClient');

class KafkaConnectService {
  constructor(config) {
    this.httpClient = new HttpClient(config.baseUrl);
  }

  async getClusterInfo() {
    return this.httpClient.get('/');
  }

  async getConnectorPlugins() {
    return this.httpClient.get('/connector-plugins');
  }

  async listConnectors() {
    return this.httpClient.get('/connectors');
  }

  async createConnector(config) {
    return this.httpClient.post('/connectors', config);
  }

  async getConnector(name) {
    return this.httpClient.get(`/connectors/${name}`);
  }

  async getConnectorStatus(name) {
    return this.httpClient.get(`/connectors/${name}/status`);
  }

  async updateConnectorConfig(name, config) {
    return this.httpClient.put(`/connectors/${name}/config`, config);
  }

  async deleteConnector(name) {
    return this.httpClient.delete(`/connectors/${name}`);
  }

  async pauseConnector(name) {
    return this.httpClient.put(`/connectors/${name}/pause`);
  }

  async resumeConnector(name) {
    return this.httpClient.put(`/connectors/${name}/resume`);
  }

  async restartConnector(name) {
    return this.httpClient.post(`/connectors/${name}/restart`);
  }

  async getConnectorTopics(name) {
    return this.httpClient.get(`/connectors/${name}/topics`);
  }

  async getConnectorTasks(name) {
    return this.httpClient.get(`/connectors/${name}/tasks`);
  }

  async getTaskStatus(name, taskId) {
    return this.httpClient.get(`/connectors/${name}/tasks/${taskId}/status`);
  }

  async restartTask(name, taskId) {
    return this.httpClient.post(`/connectors/${name}/tasks/${taskId}/restart`);
  }

  async validateConnectorConfig(pluginClass, config) {
    return this.httpClient.put(`/connector-plugins/${pluginClass}/config/validate`, config);
  }
}

module.exports = KafkaConnectService;