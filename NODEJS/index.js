const KafkaConnectService = require('../NODEJS/src/services/KafkaConnectService');
require('dotenv').config();

async function setupConnectors() {
    const connectService = new KafkaConnectService({
        baseUrl: process.env.KAFKA_CONNECT_URL || 'http://localhost:8083'
    });
    const sourceConnectorName = 'postgres-source-connector3';

    // PostgreSQL Source Connector Configuration
    const postgresSourceConfig = {
        name: sourceConnectorName,
        config: {
            'connector.class': 'io.confluent.connect.jdbc.JdbcSourceConnector',
            'tasks.max': 1,
            'connection.url': 'jdbc:postgresql://host.docker.internal:5432/postgres',
            'connection.user': 'postgres',
            'connection.password': 'admin',
            'table.whitelist': 'messages',
            'table.types': 'TABLE', // Explicitly specify table type
            'mode': 'incrementing', // Capture new and updated rows
            // 'timestamp.column.name': 'created_at', // Adjust to your timestamp column name
            'incrementing.column.name': 'id',
            'poll.interval.ms': '1000', // Poll every 1 second
            'topic.prefix': 'postgres-',
            'transforms': 'createKey,extractInt',
            'transforms.createKey.type': 'org.apache.kafka.connect.transforms.ValueToKey',
            'transforms.createKey.fields': 'id',
            'transforms.extractInt.type': 'org.apache.kafka.connect.transforms.ExtractField$Key',
            'transforms.extractInt.field': 'id'
        }
    };

    const sinkConnectorName = 'mongodb-sink-connector';
    // MongoDB Sink Connector Configuration
    const mongodbSinkConfig = {
        name: sinkConnectorName,
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

        // Create MongoDB Sink Connector (uncommented to ensure full pipeline)
        // console.log('Creating MongoDB Sink Connector...');
        // await connectService.createConnector(mongodbSinkConfig);
        // console.log('MongoDB Sink Connector created successfully');

        setTimeout(async () => {
            // Verify connector status
            try {
                const sourceStatus = await connectService.getConnectorStatus(sourceConnectorName);
                console.log('PostgreSQL Source Connector Status:', JSON.stringify(sourceStatus, null, 2));
                // const sinkStatus = await connectService.getConnectorStatus(sinkConnectorName);
                // console.log('MongoDB Sink Connector Status:', JSON.stringify(sinkStatus, null, 2));
            } catch (statusError) {
                console.error('Error fetching connector status:', statusError);
            }
        }, 5000);

    } catch (error) {
        console.error('Error setting up connectors:', error);
    }
}

// Run the setup
setupConnectors().catch(console.error);