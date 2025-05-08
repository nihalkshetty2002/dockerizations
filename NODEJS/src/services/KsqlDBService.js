const HttpClient = require('../utils/HttpClient');

class KsqlDBService {
  constructor(config) {
    this.httpClient = new HttpClient(config.baseUrl);
  }

  async getServerInfo() {
    return this.httpClient.get('/info');
  }

  async executeStatement(ksql, streamsProperties = {}) {
    return this.httpClient.post('/ksql', { ksql, streamsProperties });
  }

  async runQuery(ksql, streamsProperties = {}) {
    return this.httpClient.post('/query', { ksql, streamsProperties });
  }

  async getQueryStatus(queryId) {
    return this.httpClient.get(`/status/${queryId}`);
  }

  async terminateQuery(queryId) {
    return this.httpClient.post(`/query/${queryId}/close`);
  }
}

module.exports = KsqlDBService;