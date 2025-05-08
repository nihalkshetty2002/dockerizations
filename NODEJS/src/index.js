const KafkaRestProxyService = require('./services/KafkaRestProxyService');
const config = require('./config/config');

async function main() {
  const restProxy = new KafkaRestProxyService({
    ...config.kafkaRestProxy,
    // clusterID is optional; will be auto-detected if only one cluster exists
  });

  try {
    // Initialize the service to fetch cluster ID if not provided
    await restProxy.initialize();

    // Check existing topics
    console.log('Checking existing topics...');
    const topics = await restProxy.listTopics();
    console.log('Available topics:', topics);

    // Create topic if it doesn't exist
    console.log('Creating topic users...');
    await restProxy.createTopic('users', {
      partitions: 3,
      replicationFactor: 1, // Using 1 for single broker setup
      configs: {
        'cleanup.policy': 'delete',
        'retention.ms': '604800000' // 7 days
      }
    });
    console.log('Topic created successfully');

    // Produce a message
    console.log('Producing message...');
    const messageResponse = await restProxy.produceMessage(
      'users',
      { name: 'Bob', timestamp: new Date().toISOString() },
      { key: 'user-1' }
    );
    console.log('Message produced:', messageResponse);

    // List partitions
    console.log('Listing partitions...');
    const partitions = await restProxy.listPartitions('users');
    console.log('Partitions:', partitions);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();