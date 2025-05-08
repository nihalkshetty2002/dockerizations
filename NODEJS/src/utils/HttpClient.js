const axios = require('axios');

class HttpClient {
  constructor(baseUrl, config = {}) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
  }

  async handleRequest(promise) {
    try {
      const response = await promise;
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`${error.config.method.toUpperCase()} ${error.config.url} failed: ${error.response.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async get(url, config = {}) {
    return this.handleRequest(this.client.get(url, config));
  }

  async post(url, data, config = {}) {
    return this.handleRequest(this.client.post(url, data, config));
  }

  async put(url, data, config = {}) {
    return this.handleRequest(this.client.put(url, data, config));
  }

  async delete(url, config = {}) {
    return this.handleRequest(this.client.delete(url, config));
  }
}

module.exports = HttpClient;