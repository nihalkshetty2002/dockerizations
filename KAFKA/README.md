# Confluent Platform Docker Compose Configuration (v7.5.3)

## Overview

This repository contains a Docker Compose configuration file for deploying the **Confluent Platform (v7.5.3)**. The setup includes essential components for running a complete Kafka ecosystem:

- **Zookeeper**: Manages cluster coordination and stores metadata.
- **Kafka Broker**: The central message broker service.
- **Schema Registry**: Manages and validates Avro schemas.
- **Kafka Connect**: Facilitates integration between Kafka and external systems.
- **ksqlDB**: Enables stream processing.
- **Control Center**: Monitors and manages Kafka services (optional, if needed).

### Documentation:
For detailed product documentation, refer to the [Confluent Platform Documentation](https://www.confluent.io/previous-versions/).

---

## Components and Services

### 1. **Zookeeper**
- **Purpose**: Coordinates and manages metadata for the Kafka cluster.
- **Ports**: 
  - `2181`: Zookeeper client port.
- **Environment Variables**:
  - `ZOOKEEPER_CLIENT_PORT`: Configures the client port.
  - `ZOOKEEPER_TICK_TIME`: Configures Zookeeper tick time.
- **Healthcheck**: Verifies connectivity on port `2181`.
- **Data Storage**:
  - `zookeeper-data`: Persists Zookeeper data.
  - `zookeeper-logs`: Stores Zookeeper logs.

### 2. **Kafka Broker**
- **Purpose**: Core messaging system to manage topics, producers, and consumers.
- **Ports**: 
  - `29092`: Internal communication.
  - `9092`: External communication.
  - `9101`: JMX metrics.
- **Environment Variables**:
  - `KAFKA_BROKER_ID`: Unique broker identifier.
  - `KAFKA_ZOOKEEPER_CONNECT`: Zookeeper connection string.
  - `KAFKA_ADVERTISED_LISTENERS`: Listener configuration for external and internal traffic.
  - `KAFKA_HEAP_OPTS`: JVM heap size for Kafka.
- **Healthcheck**: Verifies connectivity on port `9092`.
- **Data Storage**:
  - `kafka-data`: Persists Kafka logs and data.

### 3. **Schema Registry**
- **Purpose**: Centralized service for managing Avro schemas.
- **Ports**:
  - `8081`: REST API for managing schemas.
- **Environment Variables**:
  - `SCHEMA_REGISTRY_HOST_NAME`: Hostname for the Schema Registry.
  - `SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS`: Kafka broker connection string.
- **Healthcheck**: Verifies Schema Registry API on port `8081`.

### 4. **Kafka Connect**
- **Purpose**: Facilitates data integration between Kafka and other systems.
- **Ports**:
  - `8083`: REST API for managing connectors.
- **Environment Variables**:
  - Basic configurations for offsets, storage, and converters.
  - Support for various connectors, including JDBC, MongoDB, Elasticsearch, S3, and Debezium.
- **Command**: Installs connectors and plugins from Confluent Hub and Maven repositories.
- **Healthcheck**: Verifies Kafka Connect API on port `8083`.
- **Volumes**:
  - Connect-specific data, custom plugins, JDBC drivers, and configuration files.

### 5. **ksqlDB Server**
- **Purpose**: Provides a SQL-like interface for stream processing.
- **Ports**:
  - `8088`: REST API for querying and managing ksqlDB streams.
- **Environment Variables**:
  - `KSQL_BOOTSTRAP_SERVERS`: Kafka broker connection string.
  - `KSQL_HOST_NAME`: Hostname for ksqlDB Server.

---

## Usage

### Prerequisites
1. **Docker**: Install Docker Engine. Refer to the [Docker installation guide](https://docs.docker.com/get-docker/).
2. **Docker Compose**: Ensure Docker Compose is installed.

### Steps to Run the Services
1. Clone this repository:
   ```bash
   git clone https://github.com/khursheed33/dockerizations.git
   cd confluent-platform-docker-compose
   ```
2. Start the services:
   ```bash
   docker-compose up -d
   ```
3. Verify that all services are running:
   ```bash
   docker-compose ps
   ```

### Accessing Services
| Service          | URL                              |
|------------------|----------------------------------|
| Zookeeper        | N/A (internal service)          |
| Kafka Broker     | `localhost:9092`                |
| Schema Registry  | `http://localhost:8081`         |
| Kafka Connect    | `http://localhost:8083`         |
| ksqlDB Server    | `http://localhost:8088`         |

---

## Volumes
Persistent data is stored in the following Docker volumes:
- **`zookeeper-data`**: Zookeeper metadata.
- **`kafka-data`**: Kafka logs and data.
- **`connect-data`**: Kafka Connect plugin storage.

---

## Customizations

### Adding Plugins and Connectors
Modify the `connect` service's `command` section to install additional connectors. Update the `CONNECT_PLUGIN_PATH` environment variable as needed.

### Scaling Kafka Brokers
To add more brokers:
1. Duplicate the `broker` service configuration.
2. Update the `KAFKA_BROKER_ID` and ports for the new broker.
3. Adjust the replication factors in existing services.

---

## Healthchecks
Each service is equipped with healthchecks to ensure stability:
- Zookeeper: Port `2181`.
- Kafka Broker: Port `9092`.
- Schema Registry: REST API on port `8081`.
- Kafka Connect: REST API on port `8083`.

---

## Troubleshooting

### Service Not Starting
- Ensure Docker Engine and Docker Compose are running.
- Check logs using:
  ```bash
  docker-compose logs <service-name>
  ```

### Connectivity Issues
- Verify that the advertised listeners for Kafka Broker are correctly configured.
- Ensure Zookeeper is running before starting the Kafka Broker.

---

## License
This project is licensed under the [MIT License](LICENSE).
