import json
import requests
from confluent_kafka import Consumer, KafkaError

# Step 1: Define the connector configuration
connector_config = {
    "name": "mongodb-source",
    "config": {
        "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
        "connection.uri": "mongodb://localhost:27017",
        "database": "analytics",
        "collection": "accounts",
        "publish.full.document.only": True,
        "poll.await.time.ms": 5000,
        "poll.max.batch.size": 1000,
        "copy.existing": True,
        "copy.existing.max.threads": 1,
        "startup.mode": "copy_existing",  # Changed to a valid value
        "output.schema.infer.value": True,
        "output.format.value": "json",
        "output.format.key": "json",
        "topic.prefix": "analytics.accounts."  # Optional: customize topic prefix
    }
}


# Step 2: Create the source connector
connect_url = "http://localhost:8083/connectors"
headers = {"Content-Type": "application/json"}

response = requests.post(connect_url, headers=headers, data=json.dumps(connector_config))
if response.status_code == 201:
    print("MongoDB source connector created successfully!")
elif response.status_code == 409:
    print("MongoDB source connector already exists.")
else:
    print(f"Failed to create connector: {response.text}")

# Step 3: Consume records from the topic
kafka_topic = "analytics.accounts"
kafka_bootstrap_servers = "localhost:9092"

consumer = Consumer({
    'bootstrap.servers': kafka_bootstrap_servers,
    'group.id': 'mongodb-consumer-group',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe([kafka_topic])
print(f"Listening for records on topic: {kafka_topic}...")

try:
    while True:
        msg = consumer.poll(1.0)  # Poll for messages with a timeout of 1 second
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            else:
                print(f"Consumer error: {msg.error()}")
                continue

        # Print the received record
        record_value = json.loads(msg.value().decode('utf-8'))
        print(f"Received record: {record_value}")
except KeyboardInterrupt:
    print("Stopped consuming messages.")
finally:
    consumer.close()
