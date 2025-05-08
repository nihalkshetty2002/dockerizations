const HttpClient = require('../utils/HttpClient');

class ControlCenterService {
  constructor(config) {
    this.httpClient = new HttpClient(config.baseUrl);
  }

  async getClusterHealth() {
    return this.httpClient.get('/');
  }

  async getClusterMetrics(clusterId) {
    return this.httpClient.get(`/2.0/monitoring/clusters/${clusterId}`);
  }
}

module.exports = ControlCenterService;