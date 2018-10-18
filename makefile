DEBUG?=servicebus*
RABBITMQ_URL=amqp://localhost:5672
HOST_IP=127.0.0.1
DO_NOT_STOP?=false

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
	RABBITMQ_URL=$(RABBITMQ_URL) HOST_IP=$(HOST_IP) DEBUG=$(DEBUG) KAFKAJS_LOG_LEVEL=error DO_NOT_STOP=$(DO_NOT_STOP)\
		./scripts/testWithKafka.sh "./node_modules/.bin/mocha -R spec --recursive --exit"

.PHONY: test test-debug
