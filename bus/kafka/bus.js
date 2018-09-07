const { Kafka, CompressionTypes } = require('kafkajs')
const Bus = require('../core/es6-bus')
    // Correlator = require('./correlator')
const topicConsumer = require('./topicConsumer')
const debug = require('debug')('servicebus-kafka')
const json = require('../formatters/json')
const util = require('util')
const requiredParam = require('../lib/requiredParam')

const _consume = Symbol('consume')
const _produce = Symbol('produce')

class KafkaBus extends Bus {
  constructor ({
    brokers = ['localhost:9092'],
    serviceName = requiredParam('serviceName'),
    log = debug,
    ssl = false,
    sasl = false,
    connectionTimeout,
    port,
    host
  } = {}) {
    super({ log })

    log('creating kafkabus')

    Object.assign(this, { 
      brokers, 
      serviceName: `servicebus-${serviceName}` ,
      log,
      // clientOptions,
      // correlator: new Correlator(options),
      formatter: json,
      initialized: false,
      topics: {}
    })

    log('creating kafka client')

    this.kafka = new Kafka({
      clientId: this.serviceName,
      brokers,
      ssl,
      sasl,
      connectionTimeout,
      port,
      host
    })

    log('creating kafka producer')

    this.producer = this.kafka.producer()

    log('kafkabus constructed')
  }

  static init (options) {
    return (async function () {
      debug(`creating new KafkaBus instance with options`, options)
      let kafkaBus = new KafkaBus(options)
      kafkaBus.log('initializing kafkabus')
      // Do async stuff
      await kafkaBus.connect()
      kafkaBus.log('connected to producer')
      kafkaBus.log(kafkaBus.listen)

      kafkaBus.initialized = true
      // Return instance
      return kafkaBus
    }())
  }  

  async connect () {
    const { log, producer } = this
    log('connecting to producer')
    try {
      await producer.connect()
    } catch (error) {
      log('ERROR CONNECTING TO PRODUCER')
      log(error)
      throw error
    }
  }

  async disconnect () {
    return await this.producer.disconnect()
  }

  // private
  async listen (topicName, options, messageHandler) {
    const bus = this
    const { log, client, initialized, topics, serviceName } = bus

    log(`listen called - creating a topic consumer for topic ${topicName}`)

    if (typeof options === "function") {
      messageHandler = options;
      options = {};
    }

    return new Promise (async (resolve, reject) => {

      let topic

      if (topics[topicName] === undefined) {
        log(`registering new consumer for topic ${topicName}`)
        try {
          topic = await topicConsumer({
            serviceName,
            topicName,
            bus,
            client,
            messageHandler
          })
        } catch (error) {
          log('error creating topicConsumer', error)
          throw error
        }
    
        topics[topicName] = topic
        log('topic registered', topicName)

        return resolve(topic)  
      } else {
        return resolve(topics[topicName])
      }
    })

  }

  async send (topicName, message, options, callback) {
    const { log, producer, initialized } = this

    log(`producing message on topic ${topicName}`);

    const sendMessage = async function (topicName, message, options) {
      // TODO: we could accept a function that calculates a partition 
      // to go along with the message here or accept a specific partition
      // as an option for example if the partition were set as an env var
      // 
      // await producer.send({
      //   topic: 'topic-name',
      //   messages: [
      //     { key: 'key1', value: 'hello world', partition: 0 },
      //     { key: 'key2', value: 'hey hey!', partition: 1 }
      //   ],
      // })
      // 

      log(`producer sending message to topic ${topicName}`, message)
      let result = await producer.send({
        topic: topicName,
        compression: CompressionTypes.GZIP,
        messages: [ {
          key: 'command',
          value: JSON.stringify(message)
        } ]
      })

      return result
    }
  
    return this.handleOutgoing(topicName, message, options, sendMessage.bind(this));
  }

}

module.exports = async function kafkabus (options) {
  let kafkaBus = await KafkaBus.init(options)
  return kafkaBus
}
