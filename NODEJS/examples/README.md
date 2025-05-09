# Kafka Usage Examples

This directory contains example applications demonstrating how to use Kafka with Node.js.

## Prerequisites

Before running these examples, ensure you have:

1. A running Kafka cluster
2. Kafka Connect service (for the MongoDB connector functionality)
3. MongoDB instance running at the specified connection details
4. Node.js installed on your machine

## Configuration

The examples use the following MongoDB configuration:

```
Database: kafka
Host: 172.52.10.57
Port: 27017
Collection: messages
Username: admin
Password: admin
```

If your MongoDB instance has different configuration, update the `DB_CONFIG` object in the example files.

## Available Examples

### kafka-usage-example.js

This example demonstrates the following Kafka operations:

1. **Kafka MongoDB Connector**: Sets up a connector between Kafka and MongoDB (optional - example will continue even if connector setup fails)
2. **Producer**: Creates a producer that sends messages to a topic every 5 seconds
3. **Consumer**: Creates a consumer to receive messages from the topic
4. **Topic Subscription**: Demonstrates how to subscribe to a Kafka topic
5. **Message Storage**: Saves received messages to a file and MongoDB (if connector is available)

#### Running the Example

1. Make sure you have a `.env` file in the root directory (NODEJS) with your Kafka configuration. You can copy from `example.env`.

2. Install dependencies (if not already installed):
   ```
   cd NODEJS
   npm install
   ```

3. Run the example:
   ```
   cd NODEJS
   node examples/kafka-usage-example.js
   ```

4. The example will:
   - Connect to Kafka
   - Try to set up a MongoDB connector (if Kafka Connect is available)
   - Start producing messages to the topic `example-messages-topic` every 5 seconds
   - Consume messages from the topic
   - Save received messages to `examples/received-messages.json`
   - Store messages in MongoDB (if connector was successfully created)

5. Press `Ctrl+C` to stop the example.

## Connector Configuration

If you want to use the MongoDB connector functionality, you need to have Kafka Connect properly set up and the MongoDB Connector for Apache Kafka installed. The example will continue running even if the connector setup fails.

For more information on setting up the MongoDB Connector, visit:
https://www.mongodb.com/docs/kafka-connector/current/

## Output

The example will create a file `received-messages.json` that contains all messages received from the Kafka topic. If the MongoDB connector was successfully set up, the messages will also be stored in the MongoDB `messages` collection.

## Debugging

If you encounter any issues:

1. Check that Kafka is running and accessible
2. Verify your MongoDB connection details
3. Ensure Kafka Connect is configured correctly (for the connector functionality)
4. Check the console output for error messages 