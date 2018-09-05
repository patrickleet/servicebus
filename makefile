DEBUG=servicebus-kafka
RABBITMQ_URL=amqp://localhost:5672
KAFKA_HOSTS=localhost:9092
HOST_IP=127.0.0.1

docker-test:
	rm -f .queues
	HOST_IP=$(HOST_IP) docker-compose up -d
	sleep 10
	make test-debug

down:
	docker-compose down --remove-orphans

test:
	RABBITMQ_URL=$(RABBITMQ_URL) KAFKA_HOSTS=$(KAFKA_HOSTS) DEBUG= ./node_modules/.bin/mocha -R spec --recursive --exit

test-debug:
	RABBITMQ_URL=$(RABBITMQ_URL) KAFKA_HOSTS=$(KAFKA_HOSTS) HOST_IP=$(HOST_IP) DEBUG=$(DEBUG) KAFKAJS_LOG_LEVEL= \
		./scripts/testWithKafka.sh "./node_modules/.bin/mocha -R spec --recursive --exit"

.PHONY: test test-debug
