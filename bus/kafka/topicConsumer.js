const { EventEmitter } = require('events')
const extend = require('extend');
const util = require('util');
const kafka = require('kafkajs')
const requiredParam = require('../lib/requiredParam')

class TopicConsumer extends EventEmitter {
  constructor({
    topicName = requiredParam('topicName'),
    bus = requiredParam('bus'),
    messageHandler = requiredParam('messageHandler')
  } = {}) {
    super()

    const self = this
    const { log, kafka, serviceName } = bus

    Object.assign(this, {
      topicName,
      bus,
      messageHandler,
      log
    })

    log(`new consumer for topic ${topicName}`)

    this.consumer = kafka.consumer({ groupId: `${serviceName}-${topicName}-consumer-group` })
  }

  static init (options) {
    return (async function () {
      let topicConsumer = new TopicConsumer(options)
      // Do async stuff
      await topicConsumer.connect()
      await topicConsumer.subscribe()
      await topicConsumer.run()
      // Return instance

      topicConsumer.initialized = true
      return topicConsumer
    }())
  }

  async connect () {
    try {
      return await this.consumer.connect()
    } catch (error) {
      log('kafka consumer - error connecting', error)
      throw error
    }
  }

  async disconnect () {
    try {
      return await this.consumer.disconnect()
    } catch (error) {
      log('kafka consumer - error disconnecting', error)
      throw error
    }
  }
  
  // TODO: partition option
  async subscribe () {
    const { consumer, bus } = this
    const { log } = bus
    log(`consumer subscribing to topic ${this.topicName}`)
    try {
      await consumer.subscribe({ topic: this.topicName })
    } catch (error) {
      log('kafka consumer - error subscribing to topic', error)
      throw error
    }
    log(`consumer has subscribed to topic ${this.topicName}`)
  }

  async run () {
    const { consumer, bus, messageHandler } = this
    const { handleIncoming, log } = bus
    log(`starting consumer processing`)
    try {
      await consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          log(`handling incoming message on topic ${topic}`)
          // log({ message })
          handleIncoming.call(
            bus,
            consumer, 
            message, 
            {}, 
            function (consumer, message, options) {
              try {
                let messageData = JSON.parse(message.value.toString())
                log('messageData:', messageData)
                messageHandler({ data: messageData }, message);
              } catch (err) {
                log('Error handling message')
                throw err
              }
            }
          )
        }
      })
    } catch (error) {
      log('kafka consumer - error running', error)
      throw error
    }
    log('consumer processing has started')
  }
}

module.exports = async function topicConsumer (options) {
  let topic = await TopicConsumer.init(options)
  return topic
}



// this.consumer = new kafka.Consumer(this.bus.client, [{ topic: this.topicName }], this.bus.consumerOptions);

//     this.consumer.on('message', function(message) {

//       // Read string into a buffer.
//       const buf = new Buffer(message.value, 'binary'); 
//       const decodedMessage = JSON.parse(buf.toString());

//       log({ decodedMessage });
      
//       let message = {
//         id: decodedMessage.id,
//         type: decodedMessage.type,
//         data: JSON.stringify(decodedMessage.data),
//         cid: decodedMessage.cid
//       };

//       log('handle incoming message');
//       log({ message });

//       self.bus.handleIncoming(self.consumer, message, options, function (consumer, message, options) {
//         try {
//           self.messageHandler(message.content, message);
//         } catch (err) {
//           if (process.domain && process.domain.listeners('error')) {
//             process.domain.emit('error', err);
//           } else {
//             self.emit('error', err);
//           }
//         }
//       });
//     });

//     this.consumer.on('error', function(err) {
//       self.bus.log('consumer error', err);
//       self.bus.emit('consumer.error', err)
//     });


//     this.emit('ready');
//     this.initialized = true;