const { Kafka } = require('kafkajs');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Output file path
const OUTPUT_FILE = path.join(__dirname, 'kafka-messages.txt');

// Function to detect if message appears encrypted (basic heuristic)
function isEncrypted(message) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    const hexRegex = /^[0-9A-Fa-f]+$/;
    return !/^[ -~]*$/.test(message) || 
           base64Regex.test(message) || 
           hexRegex.test(message);
}

// Function to format message for output
function formatMessage({ topic, partition, message }) {
    const value = message.value.toString();
    const timestamp = new Date(parseInt(message.timestamp)).toISOString();
    const isEnc = isEncrypted(value);
    
    return JSON.stringify({
        topic,
        partition,
        offset: message.offset,
        value: isEnc ? `[ENCRYPTED] ${value}` : value,
        timestamp,
        encryptionStatus: isEnc ? 'encrypted' : 'plain'
    }, null, 2) + '\n';
}

async function createConsumer() {
    const kafka = new Kafka({
        clientId: 'postgres-consumer',
        brokers: ['localhost:9092']
    });

    // Use a unique groupId to avoid committed offsets
    const groupId = `postgres-consumer-group-${Date.now()}`;
    const consumer = kafka.consumer({ 
        groupId,
        fromBeginning: true 
    });

    try {
        await consumer.connect();
        console.log('Connected to Kafka');

        // Ensure output file exists
        await fs.writeFile(OUTPUT_FILE, '', { flag: 'a' });
        console.log(`Messages will be written to ${OUTPUT_FILE}`);

        await consumer.subscribe({ 
            topic: 'postgres-messages',
            fromBeginning: true 
        });
        console.log('Subscribed to topic: postgres-messages');

        // Explicitly seek to the beginning for all partitions
        consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                // Format and log to console
                const formattedMessage = formatMessage({ topic, partition, message });
                console.log(JSON.parse(formattedMessage));

                // Append to file
                try {
                    await fs.appendFile(OUTPUT_FILE, formattedMessage);
                } catch (fileError) {
                    console.error('Error writing to file:', fileError);
                }
            },
            eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                if (!isRunning() || isStale()) return;

                // Seek to earliest offset for the first batch
                if (batch.isFirstBatch()) {
                    for (const partition of batch.partitions) {
                        await consumer.seek({
                            topic: batch.topic,
                            partition,
                            offset: '0' // Earliest offset
                        });
                        console.log(`Seek to earliest offset for partition ${partition}`);
                    }
                }

                // Process messages in batch
                for (const message of batch.messages) {
                    const formattedMessage = formatMessage({
                        topic: batch.topic,
                        partition: batch.partition,
                        message
                    });
                    console.log(JSON.parse(formattedMessage));

                    try {
                        await fs.appendFile(OUTPUT_FILE, formattedMessage);
                    } catch (fileError) {
                        console.error('Error writing to file:', fileError);
                    }

                    resolveOffset(message.offset);
                    await heartbeat();
                }
            }
        });

        console.log('Consumer is running and listening for messages...');

    } catch (error) {
        console.error('Error in consumer:', error);
    }
}

// Handle graceful shutdown
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

errorTypes.forEach(type => {
    process.on(type, async () => {
        try {
            console.log(`process.on ${type}`);
            await consumer.disconnect();
            process.exit(0);
        } catch (_) {
            process.exit(1);
        }
    });
});

signalTraps.forEach(type => {
    process.once(type, async () => {
        try {
            await consumer.disconnect();
        } finally {
            process.kill(process.pid, type);
        }
    });
});

// Start the consumer
createConsumer().catch(console.error);