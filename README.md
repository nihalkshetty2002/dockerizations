# Dockerizations

This repository provides Docker configurations and services to work with different technologies and tools. One of the key components is the Kafka service, which is set up with REST APIs for integration, testing, and management.

## Project Overview

The project includes Docker Compose configurations for setting up various services, such as Kafka and related components. It also provides a REST API interface to interact with Kafka services, allowing you to perform tasks like producing and consuming messages via API calls.

### Services Included:
- **Kafka**: Distributed event streaming platform.
- **Zookeeper**: Centralized service for maintaining configuration information, naming, and providing distributed synchronization.
- **Kafka REST Proxy**: A RESTful interface to Kafka for producing and consuming messages via HTTP.
- **Kafka Connect**: A tool for scalable and reliable streaming data between Apache Kafka and other systems.
- **Schema Registry**: Manages Avro schemas for Kafka data serialization and deserialization.

## Setup and Installation

To set up the Kafka and related services using Docker, follow the steps below:

### 1. Clone the Repository

```bash
git clone https://github.com/khursheed33/dockerizations.git
cd dockerizations
```

### 2. Set Up Docker Compose

The repository includes a `docker-compose.yml` file that configures and starts the necessary services for Kafka. You can use this file to set up your environment.

```bash
docker-compose up -d
```

This will start the following services:
- **Kafka** - The Kafka broker
- **Zookeeper** - The Zookeeper service for Kafka
- **Kafka REST Proxy** - REST interface for Kafka operations

### 3. Verify Services

You can check the status of the services using Docker Compose:

```bash
docker-compose ps
```

The following services should be up and running:
- `zookeeper`
- `kafka`
- `kafka-rest`

## Kafka REST API

The Kafka REST Proxy allows you to interact with Kafka via HTTP endpoints. You can produce and consume messages from Kafka topics using the REST API.

### REST API Endpoints

#### 1. Produce Message to Kafka Topic

**POST** `/topics/<topic-name>`

This endpoint produces messages to the specified Kafka topic.

**Request Body Example**:
```json
{
  "records": [
    {
      "value": "Hello, Kafka!"
    }
  ]
}
```

**Response Example**:
```json
{
  "offsets": [
    {
      "partition": 0,
      "offset": 0
    }
  ]
}
```

#### 2. Consume Messages from Kafka Topic

**GET** `/topics/<topic-name>/partitions/<partition-id>/messages`

This endpoint consumes messages from the specified Kafka topic and partition.

**Query Parameters**:
- `count`: Number of messages to consume (default: 10).
- `offset`: Starting offset to consume messages from (default: latest).

**Response Example**:
```json
{
  "records": [
    {
      "value": "Hello, Kafka!",
      "timestamp": "2023-01-21T00:00:00Z",
      "partition": 0,
      "offset": 0
    }
  ]
}
```

### Kafka REST API Documentation

For a more detailed API documentation, please refer to the [KAFKA/README.md](KAFKA/README.md) file, which includes the specifics of the Kafka REST Proxy API.

## Python Code to Test Kafka APIs

This section includes Python code to test the Kafka REST APIs. The Python script interacts with the Kafka REST Proxy to produce and consume messages.

### 1. Install Required Libraries

To get started, you need to install the required Python libraries.

```bash
pip install requests
```

### 2. Python Code for Producing Messages

```python
import requests
import json

KAFKA_REST_PROXY_URL = "http://localhost:8082"

def produce_message(topic, message):
    url = f"{KAFKA_REST_PROXY_URL}/topics/{topic}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "records": [
            {"value": message}
        ]
    }
    
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        print(f"Message successfully produced to topic '{topic}'.")
        print("Response:", response.json())
    else:
        print(f"Failed to produce message. Status code: {response.status_code}")
        print("Response:", response.text)

# Example usage
produce_message('test-topic', 'Hello, Kafka from Python!')
```

### 3. Python Code for Consuming Messages

```python
import requests

KAFKA_REST_PROXY_URL = "http://localhost:8082"

def consume_messages(topic, partition=0, count=10, offset='latest'):
    url = f"{KAFKA_REST_PROXY_URL}/topics/{topic}/partitions/{partition}/messages"
    params = {'count': count, 'offset': offset}
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        print(f"Messages consumed from topic '{topic}', partition {partition}:")
        records = response.json().get('records', [])
        for record in records:
            print(f"Offset: {record['offset']}, Message: {record['value']}")
    else:
        print(f"Failed to consume messages. Status code: {response.status_code}")
        print("Response:", response.text)

# Example usage
consume_messages('test-topic', partition=0, count=5)
```

### 4. Running the Code

To test the Kafka API:

1. Start the Docker services using `docker-compose up -d`.
2. Run the Python scripts for producing and consuming messages from Kafka.

## Troubleshooting

### Common Issues

1. **Kafka Connection Issues**: Ensure that all Kafka services are up and running by checking the logs:
   ```bash
   docker-compose logs kafka
   ```

2. **API Errors**: If you encounter API errors, check the Kafka REST Proxy logs to identify any issues:
   ```bash
   docker-compose logs kafka-rest
   ```

### Docker Logs

You can view the logs for each service by running:

```bash
docker-compose logs <service-name>
```

Replace `<service-name>` with the name of the specific service (e.g., `kafka`, `zookeeper`, `kafka-rest`).

## Contributing

Feel free to fork the repository, make changes, and submit pull requests. For any contributions or suggestions, please open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

If you have any questions or need further assistance, feel free to contact the repository owner at:

- GitHub: [khursheed33](https://github.com/khursheed33)
- Email: gaddi33khursheed@gmail.com
