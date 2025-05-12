require('dotenv').config();

const config = {
    // Application related configuration
    APP: {
        server: {
            port: parseInt(process.env.PORT, 10) || 3000,
            host: process.env.HOST || 'localhost'
        }
    },
    
    // Kafka ecosystem related configuration
    KAFKA: {
        // Core Kafka configuration
        core: {
            clientId: process.env.KAFKA_CLIENT_ID || 'nodejs-kafka-client',
            bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092',
            ssl: process.env.KAFKA_SSL === 'true',
            connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10) || 3000,
            requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT, 10) || 30000,
            logLevel: process.env.KAFKA_LOG_LEVEL || 'INFO' // ERROR, WARN, INFO, DEBUG
        },
        
        // REST Proxy configuration
        restProxy: {
            baseUrl: process.env.KAFKA_REST_PROXY_URL || 'http://localhost:8082',
            timeout: parseInt(process.env.KAFKA_REST_PROXY_TIMEOUT, 10) || 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        },
        
        // Schema Registry configuration
        schemaRegistry: {
            baseUrl: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081'
        },
        
        // Kafka Connect configuration
        connect: {
            baseUrl: process.env.KAFKA_CONNECT_URL || 'http://localhost:8083'
        },
        
        // Control Center configuration
        controlCenter: {
            baseUrl: process.env.CONTROL_CENTER_URL || 'http://localhost:9021'
        },
        
        // KSQLDB configuration
        ksqlDB: {
            baseUrl: process.env.KSQLDB_URL || 'http://localhost:8088'
        }
    },
    
    // Database related configuration
    DATABASE: {
        // MongoDB configuration
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kafka',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        }
    }
};

// Add SASL configuration if environment variables are set
if (process.env.KAFKA_SASL_MECHANISM) {
    config.KAFKA.core.sasl = {
        mechanism: process.env.KAFKA_SASL_MECHANISM,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD
    };
}

module.exports = config;