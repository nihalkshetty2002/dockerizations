# Kafka Services & RESTAPIs

- **Kafka Connect REST API**: For managing connectors, tasks, and plugins (exposed on `http://localhost:8083`).
- **Schema Registry REST API**: For managing Avro schemas (exposed on `http://localhost:8081`).
- **ksqlDB REST API**: For managing stream processing queries (exposed on `http://localhost:8088`).
- **Control Center REST API**: For monitoring and managing the Kafka cluster (exposed on `http://localhost:9021`).

The guide includes the endpoint, HTTP method, request payload (if applicable), response format, and a one-line explanation for each endpoint. Since your setup does not include the Confluent REST Proxy (which provides RESTful access to Kafka for producing/consuming messages and managing topics), I’ve focused on the services present in your Docker Compose configuration. The `README.md` is tailored to your setup, assuming the services are running as configured.


# Confluent Platform REST API Guide

This guide provides a comprehensive list of REST API endpoints for managing Confluent Platform 7.5.3 services, including Kafka Connect, Schema Registry, ksqlDB, and Control Center, as configured in the Docker Compose setup. Each endpoint includes the HTTP method, request payload, response format, and a one-line explanation. The APIs are accessible at the following base URLs:
- **Kafka Connect**: `http://localhost:8083`
- **Schema Registry**: `http://localhost:8081`
- **ksqlDB**: `http://localhost:8088`
- **Control Center**: `http://localhost:9021`

## Prerequisites
- **Docker Compose Setup**: Ensure all services (Zookeeper, Kafka broker, Schema Registry, Kafka Connect, ksqlDB, Control Center) are running.
- **Tools**: Use `curl`, Postman, or similar tools to make HTTP requests.
- **MongoDB Source Connector**: The `com.mongodb.kafka.connect.MongoSourceConnector` is installed, as confirmed by `/connector-plugins`.

## Setup Instructions
1. **Start the Services**:
   ```bash
   docker-compose up -d
   ```
   Verify all services are running:
   ```bash
   docker ps
   ```

2. **Test API Accessibility**:
   - Kafka Connect: `curl http://localhost:8083/`
   - Schema Registry: `curl http://localhost:8081/`
   - ksqlDB: `curl http://localhost:8088/info`
   - Control Center: `curl http://localhost:9021`

3. **Use the Endpoints**:
   Follow the examples below, replacing placeholders (e.g., `<connector-name>`, `<subject>`) with actual values.

## REST API Endpoints

### Kafka Connect REST API (`http://localhost:8083`)
Manages connectors, tasks, and plugins for data integration.

#### 1. Get Cluster Information
- **Endpoint**: `GET /`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"version":"string","commit":"string","kafka_cluster_id":"string"}
  ```
- **Explanation**: Retrieves the Kafka Connect worker version, commit ID, and Kafka cluster ID.

#### 2. Get Connector Plugins
- **Endpoint**: `GET /connector-plugins`
- **Request Payload**: None
- **Response Format**:
  ```json
  [{"class":"string","type":"source|sink","version":"string"}]
  ```
- **Explanation**: Lists all installed connector plugins.

#### 3. List All Connectors
- **Endpoint**: `GET /connectors`
- **Request Payload**: None
- **Response Format**:
  ```json
  ["string"]
  ```
- **Explanation**: Returns a list of all connector names.

#### 4. Create a Connector
- **Endpoint**: `POST /connectors`
- **Request Payload**:
  ```json
  {"name":"string","config":{"connector.class":"string","key.converter":"string","value.converter":"string"}}
  ```
- **Response Format**:
  ```json
  {"name":"string","config":{},"tasks":[{"connector":"string","task":0}],"type":"source|sink"}
  ```
- **Explanation**: Creates a new connector with the specified configuration.

#### 5. Get Connector Information
- **Endpoint**: `GET /connectors/<connector-name>`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"name":"string","config":{},"tasks":[{"connector":"string","task":0}],"type":"source|sink"}
  ```
- **Explanation**: Retrieves configuration and tasks for a specific connector.

#### 6. Get Connector Status
- **Endpoint**: `GET /connectors/<connector-name>/status`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"name":"string","connector":{"state":"RUNNING|PAUSED|FAILED","worker_id":"string"},"tasks":[{"id":0,"state":"RUNNING|PAUSED|FAILED","worker_id":"string"}],"type":"source|sink"}
  ```
- **Explanation**: Returns the current state of the connector and its tasks.

#### 7. Update Connector Configuration
- **Endpoint**: `PUT /connectors/<connector-name>/config`
- **Request Payload**:
  ```json
  {"connector.class":"string"}
  ```
- **Response Format**:
  ```json
  {"name":"string","config":{},"tasks":[{"connector":"string","task":0}],"type":"source|sink"}
  ```
- **Explanation**: Updates the configuration of an existing connector.

#### 8. Delete a Connector
- **Endpoint**: `DELETE /connectors/<connector-name>`
- **Request Payload**: None
- **Response Format**: No content (HTTP 204)
- **Explanation**: Deletes the specified connector and its tasks.

#### 9. Pause a Connector
- **Endpoint**: `PUT /connectors/<connector-name>/pause`
- **Request Payload**: None
- **Response Format**: No content (HTTP 202)
- **Explanation**: Pauses the connector and its tasks.

#### 10. Resume a Connector
- **Endpoint**: `PUT /connectors/<connector-name>/resume`
- **Request Payload**: None
- **Response Format**: No content (HTTP 202)
- **Explanation**: Resumes a paused connector and its tasks.

#### 11. Restart a Connector
- **Endpoint**: `POST /connectors/<connector-name>/restart`
- **Request Payload**: None
- **Response Format**: No content (HTTP 200 or 202)
- **Explanation**: Restarts the connector and its tasks.

#### 12. Get Topics Used by a Connector
- **Endpoint**: `GET /connectors/<connector-name>/topics`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"<connector-name>":{"topics":["string"]}}
  ```
- **Explanation**: Lists Kafka topics consumed or produced by the connector.

#### 13. Get Connector Tasks
- **Endpoint**: `GET /connectors/<connector-name>/tasks`
- **Request Payload**: None
- **Response Format**:
  ```json
  [{"id":{"connector":"string","task":0},"config":{"task.class":"string"}}]
  ```
- **Explanation**: Lists all tasks for the specified connector.

#### 14. Get Task Status
- **Endpoint**: `GET /connectors/<connector-name>/tasks/<task-id>/status`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"id":0,"state":"RUNNING|PAUSED|FAILED","worker_id":"string","trace":"string"}
  ```
- **Explanation**: Returns the current state of a specific task.

#### 15. Restart a Task
- **Endpoint**: `POST /connectors/<connector-name>/tasks/<task-id>/restart`
- **Request Payload**: None
- **Response Format**: No content (HTTP 200)
- **Explanation**: Restarts the specified task.

#### 16. Validate Connector Configuration
- **Endpoint**: `PUT /connector-plugins/<plugin-class>/config/validate`
- **Request Payload**:
  ```json
  {"connector.class":"string"}
  ```
- **Response Format**:
  ```json
  {"name":"string","error_count":0,"groups":["string"],"configs":[{"definition":{"name":"string"},"value":{"name":"string"}}]}
  ```
- **Explanation**: Validates a connector’s configuration and returns errors or warnings.

### Schema Registry REST API (`http://localhost:8081`)
Manages Avro schemas for Kafka topics.

#### 17. List All Subjects
- **Endpoint**: `GET /subjects`
- **Request Payload**: None
- **Response Format**:
  ```json
  ["string"]
  ```
- **Explanation**: Lists all schema subjects registered in the Schema Registry.

#### 18. List Versions for a Subject
- **Endpoint**: `GET /subjects/<subject>/versions`
- **Request Payload**: None
- **Response Format**:
  ```json
  [integer]
  ```
- **Explanation**: Lists all version numbers for a specific subject.

#### 19. Get Schema by Version
- **Endpoint**: `GET /subjects/<subject>/versions/<version>`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"subject":"string","version":0,"id":0,"schema":"string"}
  ```
- **Explanation**: Retrieves the schema for a specific subject and version.

#### 20. Register a New Schema
- **Endpoint**: `POST /subjects/<subject>/versions`
- **Request Payload**:
  ```json
  {"schema":"string"}
  ```
- **Response Format**:
  ```json
  {"id":0}
  ```
- **Explanation**: Registers a new schema under the specified subject.

#### 21. Delete a Subject
- **Endpoint**: `DELETE /subjects/<subject>`
- **Request Payload**: None
- **Response Format**:
  ```json
  ["string"]
  ```
- **Explanation**: Deletes the specified subject and all its versions (soft delete).

#### 22. Check Schema Compatibility
- **Endpoint**: `POST /compatibility/subjects/<subject>/versions/<version>`
- **Request Payload**:
  ```json
  {"schema":"string"}
  ```
- **Response Format**:
  ```json
  {"is_compatible":true}
  ```
- **Explanation**: Checks if a schema is compatible with a specific subject and version.

#### 23. Get Schema by ID
- **Endpoint**: `GET /schemas/ids/<id>`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"schema":"string"}
  ```
- **Explanation**: Retrieves the schema associated with a specific schema ID.

#### 24. Get Global Configuration
- **Endpoint**: `GET /config`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"compatibility":"BACKWARD|FORWARD|FULL|NONE"}
  ```
- **Explanation**: Retrieves the global compatibility settings for the Schema Registry.

#### 25. Update Global Configuration
- **Endpoint**: `PUT /config`
- **Request Payload**:
  ```json
  {"compatibility":"BACKWARD|FORWARD|FULL|NONE"}
  ```
- **Response Format**:
  ```json
  {"compatibility":"BACKWARD|FORWARD|FULL|NONE"}
  ```
- **Explanation**: Updates the global compatibility settings.

### ksqlDB REST API (`http://localhost:8088`)
Manages stream processing queries and configurations.

#### 26. Get Server Information
- **Endpoint**: `GET /info`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"KsqlServerInfo":{"version":"string","kafkaClusterId":"string","ksqlServiceId":"string","serverStatus":"string"}}
  ```
- **Explanation**: Retrieves ksqlDB server version, cluster ID, and status.

#### 27. Execute a ksqlDB Statement
- **Endpoint**: `POST /ksql`
- **Request Payload**:
  ```json
  {"ksql":"string","streamsProperties":{}}
  ```
- **Response Format**:
  ```json
  [{"statementText":"string","warnings":["string"]}]
  ```
- **Explanation**: Executes a ksqlDB statement (e.g., `CREATE STREAM`).

#### 28. Run a Query
- **Endpoint**: `POST /query`
- **Request Payload**:
  ```json
  {"ksql":"string","streamsProperties":{}}
  ```
- **Response Format**:
  ```json
  [{"header":{"queryId":"string","schema":"string"}},{"row":{"columns":["string"]}}]
  ```
- **Explanation**: Runs a ksqlDB query and streams results (push query).

#### 29. Get Query Status
- **Endpoint**: `GET /status/<query-id>`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"status":"RUNNING|ERROR|TERMINATED","message":"string"}
  ```
- **Explanation**: Retrieves the status of a specific query.

#### 30. Terminate a Query
- **Endpoint**: `POST /query/<query-id>/close`
- **Request Payload**: None
- **Response Format**: No content (HTTP 200)
- **Explanation**: Terminates a running push query.

### Control Center REST API (`http://localhost:9021`)
Monitors and manages the Kafka cluster (limited public endpoints).

#### 31. Get Cluster Health
- **Endpoint**: `GET /`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"status":"UP"}
  ```
- **Explanation**: Checks the health of the Control Center service.

#### 32. Get Metrics
- **Endpoint**: `GET /2.0/monitoring/clusters/<cluster-id>`
- **Request Payload**: None
- **Response Format**:
  ```json
  {"cluster_id":"string","metrics":{"broker_count":0,"topic_count":0}}
  ```
- **Explanation**: Retrieves metrics for the specified Kafka cluster (requires authentication in production).

## Usage Example: MongoDB Source Connector
1. **Create Connector**:
   ```bash
   curl -X POST -H "Content-Type: application/json" --data '{"name":"mongo-source-users","config":{"connector.class":"com.mongodb.kafka.connect.MongoSourceConnector","connection.uri":"mongodb://admin:admin@172.52.10.57:27017/?authSource=admin","database":"mydb","collection":"users","topic.prefix":"mongo","key.converter":"org.apache.kafka.connect.storage.StringConverter","value.converter":"io.confluent.connect.avro.AvroConverter","value.converter.schema.registry.url":"http://schema-registry:8081"}}' http://localhost:8083/connectors
   ```

2. **Register Schema**:
   ```bash
   curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" --data '{"schema":"{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"email\",\"type\":\"string\"}]}"}' http://localhost:8081/subjects/mongo.mydb.users-value/versions
   ```

3. **Run ksqlDB Query**:
   ```bash
   curl -X POST -H "Content-Type: application/json" --data '{"ksql":"SELECT * FROM users EMIT CHANGES;"}' http://localhost:8088/query
   ```

## Notes
- **Authentication**: APIs are unauthenticated in this setup. For production, enable SSL/TLS and authentication.
- **Confluent REST Proxy**: Not included in the setup. Add it for RESTful Kafka message production/consumption.
- **Documentation**: Refer to:
  - [Kafka Connect REST API](https://docs.confluent.io/platform/current/connect/references/restapi.html)
  - [Schema Registry REST API](https://docs.confluent.io/platform/current/schema-registry/develop/api.html)
  - [ksqlDB REST API](https://docs.confluent.io/platform/current/ksqldb/rest-api.html)
  - [Control Center](https://docs.confluent.io/platform/current/control-center/index.html)
- **Troubleshooting**: Check container logs (e.g., `docker logs connect`) for errors.

---
*Generated on May 08, 2025, for Confluent Platform 7.5.3*
