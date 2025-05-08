module.exports = {
    kafkaRestProxy: {
        baseUrl: 'http://localhost:8082',
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json'
        }
    },
    schemaRegistry: {
        baseUrl: 'http://localhost:8081'
    },
    kafkaConnect: {
        baseUrl: 'http://localhost:8083'
    },
    controlCenter: {
        baseUrl: 'http://localhost:9021'
    },
    ksqlDB: {
        baseUrl: 'http://localhost:8088'
    }
};