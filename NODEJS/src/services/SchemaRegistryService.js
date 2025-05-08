const HttpClient = require('../utils/HttpClient');

class SchemaRegistryService {
  constructor(config) {
    this.httpClient = new HttpClient(config.baseUrl);
  }

  async listSubjects() {
    return this.httpClient.get('/subjects');
  }

  async listSubjectVersions(subject) {
    return this.httpClient.get(`/subjects/${subject}/versions`);
  }

  async getSchemaByVersion(subject, version) {
    return this.httpClient.get(`/subjects/${subject}/versions/${version}`);
  }

  async registerSchema(subject, schema) {
    return this.httpClient.post(`/subjects/${subject}/versions`, { schema });
  }

  async deleteSubject(subject) {
    return this.httpClient.delete(`/subjects/${subject}`);
  }

  async checkSchemaCompatibility(subject, version, schema) {
    return this.httpClient.post(`/compatibility/subjects/${subject}/versions/${version}`, { schema });
  }

  async getSchemaById(id) {
    return this.httpClient.get(`/schemas/ids/${id}`);
  }

  async getGlobalConfig() {
    return this.httpClient.get('/config');
  }

  async updateGlobalConfig(compatibility) {
    return this.httpClient.put('/config', { compatibility });
  }
}

module.exports = SchemaRegistryService;