# Kafka REST API

This project provides comprehensive Node.js APIs for interacting with Apache Kafka, offering both REST Proxy-based and direct Kafka connectivity.

## Features

- Topic management (create, list, delete, update config)
- Producer functionality (create producers, send messages)
- Consumer management (create consumers, subscribe/unsubscribe)
- Stream consumption support
- ACL management
- Consumer group operations
- Direct Kafka connectivity via KafkaJS
- REST Proxy wrapper for Confluent REST Proxy

## Requirements

- Node.js 14+
- Confluent Platform (with Kafka, Schema Registry, and REST Proxy)
- Docker for running the Kafka infrastructure (optional)

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Edit the `src/config/config.js` file to configure:

- Kafka REST Proxy connection
- Direct Kafka connection
- Server port and host

## Usage

### Running the Demo

To run the basic demo that showcases topic creation, message production, and consumption:

```bash
npm run demo
```

### Running the REST API Server

To start the REST API server that exposes all Kafka functionality via HTTP endpoints:

```bash
npm run api
```

### Running the REST Proxy Server

To start only the REST Proxy wrapper server:

```bash
npm run server
```

## API Reference

### Topic Management

- `GET /api/topics` - List all topics
- `GET /api/topics/:name` - Get topic details
- `POST /api/topics` - Create a topic
- `DELETE /api/topics/:name` - Delete a topic
- `PATCH /api/topics/:name/config` - Update topic configuration

### Producer Operations

- `POST /api/producers` - Create a new producer (direct Kafka)
- `POST /api/producers/:id/messages` - Send messages (direct Kafka)
- `DELETE /api/producers/:id` - Close a producer (direct Kafka)
- `POST /api/topics/:name/records` - Produce a message (REST Proxy)
- `POST /api/topics/:name/batch` - Produce multiple messages (REST Proxy)

### Consumer Operations (REST Proxy)

- `POST /api/consumer-groups/:groupId/consumers` - Create a consumer
- `POST /api/consumers/:consumerId/subscription` - Subscribe to topics
- `DELETE /api/consumers/:consumerId/subscription` - Unsubscribe from topics
- `GET /api/consumers/:consumerId/records` - Consume messages
- `DELETE /api/consumers/:consumerId` - Close a consumer

### Consumer Operations (Direct Kafka)

- `POST /api/consumers` - Create a consumer
- `POST /api/consumers/:id/subscribe` - Subscribe to topics
- `POST /api/consumers/:id/start` - Start consuming messages
- `POST /api/consumers/:id/stop` - Stop consuming messages
- `DELETE /api/consumers/:id/close` - Close a consumer

### Consumer Group Management

- `GET /api/consumer-groups` - List consumer groups
- `GET /api/consumer-groups/:groupId` - Get consumer group details
- `DELETE /api/consumer-groups/:groupId` - Delete a consumer group

## Architecture

This project provides two different approaches to interact with Kafka:

1. **REST Proxy Approach**: Uses Confluent's REST Proxy to interact with Kafka through HTTP requests. Ideal for scenarios where direct Kafka connectivity is not possible or desired.

2. **Direct Kafka Approach**: Uses KafkaJS to connect directly to Kafka brokers. Provides better performance and more features, but requires direct connectivity to the Kafka cluster.

The API server (`api.js`) unifies both approaches under a single API, allowing clients to choose which approach to use through a `provider` query parameter.

## Docker Integration

The Kafka setup is defined in `KAFKA/docker-compose.yml`, which provides a complete Confluent Platform environment with Zookeeper, Kafka, Schema Registry, REST Proxy, Connect, and Control Center.

To start the Kafka environment:

```bash
cd ../KAFKA
docker-compose up -d
```

## Extension Points

- Add authentication and authorization
- Implement WebSockets for real-time message streaming
- Add schema management with Schema Registry
- Integrate with Kafka Connect for data integration
- Add monitoring and metrics endpoints

## License

This project is licensed under the MIT License - see the LICENSE file for details. 