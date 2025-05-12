const { KafkaConnectService } = require('../src/services');
require('dotenv').config();

async function setupConnectors() {
    const connectService = new KafkaConnectService({
        baseUrl: process.env.KAFKA_CONNECT_URL || 'http://localhost:8083'
    });

    // PostgreSQL Source Connector Configuration
    const postgresSourceConfig = {
        name: 'postgres-source-connector',
        config: {
            'connector.class': 'io.confluent.connect.jdbc.JdbcSourceConnector',
            'tasks.max': 1,
            'connection.url': process.env.POSTGRES_CONNECTION_URL,
            'connection.user': process.env.POSTGRES_USER,
            'connection.password': process.env.POSTGRES_PASSWORD,
            'table.whitelist': process.env.POSTGRES_TABLES,
            'mode': 'incrementing',
            'incrementing.column.name': 'id',
            'topic.prefix': 'postgres-',
            'transforms': 'createKey,extractInt',
            'transforms.createKey.type': 'org.apache.kafka.connect.transforms.ValueToKey',
            'transforms.createKey.fields': 'id',
            'transforms.extractInt.type': 'org.apache.kafka.connect.transforms.ExtractField$Key',
            'transforms.extractInt.field': 'id'
        }
    };

    // MongoDB Sink Connector Configuration
    const mongodbSinkConfig = {
        name: 'mongodb-sink-connector',
        config: {
            'connector.class': 'com.mongodb.kafka.connect.MongoSinkConnector',
            'tasks.max': 1,
            'topics': 'postgres-.*',
            'connection.uri': process.env.MONGODB_CONNECTION_URI,
            'database': process.env.MONGODB_DATABASE,
            'collection': process.env.MONGODB_COLLECTION,
            'document.id.strategy': 'com.mongodb.kafka.connect.sink.processor.id.strategy.ProvidedInKeyStrategy',
            'transforms': 'unwrap',
            'transforms.unwrap.type': 'io.debezium.transforms.ExtractNewRecordState',
            'transforms.unwrap.drop.tombstones': 'false',
            'transforms.unwrap.delete.handling.mode': 'rewrite'
        }
    };

    try {
        // Create PostgreSQL Source Connector
        console.log('Creating PostgreSQL Source Connector...');
        await connectService.createConnector(postgresSourceConfig);
        console.log('PostgreSQL Source Connector created successfully');

        // Create MongoDB Sink Connector
        console.log('Creating MongoDB Sink Connector...');
        await connectService.createConnector(mongodbSinkConfig);
        console.log('MongoDB Sink Connector created successfully');

        // Verify connector status
        const sourceStatus = await connectService.getConnectorStatus('postgres-source-connector');
        const sinkStatus = await connectService.getConnectorStatus('mongodb-sink-connector');

        console.log('PostgreSQL Source Connector Status:', sourceStatus);
        console.log('MongoDB Sink Connector Status:', sinkStatus);

    } catch (error) {
        console.error('Error setting up connectors:', error);
    }
}

// Run the setup
setupConnectors().catch(console.error); 