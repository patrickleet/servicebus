const noop = function () {};
const log = require('debug')('servicebus:test');
const kafkabus = require('./kafka-bus-shim');
const confirmBus = require('./bus-confirm-shim').bus;
const sinon = require('sinon');
const util = require('util');
const {} = '../testHelpers'

describe('kafka servicebus', function(){


  describe('#send & #listen', function() {

    it('should cause message to be received by listen', async function (){
      return new Promise(async (resolve, reject) => {
        let bus = await kafkabus()
        this.timeout(30000);
        log('bus.listen', bus.listen)
        let listener = await bus.listen('my.event.1', function (event) {
          console.log('event data', event.data)
          resolve(true);
        });
        await bus.send('my.event.1', { my: 'event' });
      })      
    });

    it.skip('should distribute out to subsequent listeners when multiple listening', async function (){
      return new Promise(async (resolve, reject) => {
        let bus = await kafkabus()
        this.timeout(90000);
        var count = 0
        var results = []
        function tryDone(){
          count++;
          if (count === 4) {
            expect(results).toEqual([1,2,3,4])
            resolve(true);
          }
        }
        bus.listen('my.event.2', function (event) {
          results.push(1)
          console.log(1)
          tryDone();
        });
        bus.listen('my.event.2', function (event) {
          results.push(2)
          console.log(2)
          tryDone();
        });
        bus.listen('my.event.2', function (event) {
          results.push(3)
          console.log(3)
          tryDone();
        });
        bus.listen('my.event.2', function (event) {
          results.push(4)
          console.log(4)
          tryDone();
        });
        setTimeout(function () {
          bus.send('my.event.2', { my: 'event' });
          bus.send('my.event.2', { my: 'event' });
          bus.send('my.event.2', { my: 'event' });
          bus.send('my.event.2', { my: 'event' });
        }, 10);
      })
    });

    it.only('can handle high event throughput', async function (){
      return new Promise(async (resolve, reject) => {
        let bus = await kafkabus()
        let time = 30000
        this.timeout(time);
        setTimeout(() => {
          console.log(`processed ${count} messages`)
        }, time - 100)
        var count = 0, endCount = 12000;
        function tryDone(){
          count++;
          if (count >= endCount) {
            console.log(`processed ${count} messages`)
            resolve();
          }
        }
        var i = 0;
        await bus.listen('my.event.3', function (event) {
          tryDone();
        });
        for(var i = 0; i <= endCount; ++i) {
          await bus.send('my.event.3', { my: 'event' });
        }
      })
    });

    it('sends subsequent messages only after previous messages are acknowledged', async function (){
      return new Promise(async (resolve, reject) => {
        let bus = await kafkabus()
        this.timeout(90000);
        var count = 0;
        var interval = setInterval(function checkDone () {
          if (count === 4) {
            clearInterval(interval);
            bus.destroyListener('my.event.4').on('success', function () {
              resolve();
            });
          }
        }, 10);
        bus.listen('my.event.4', { ack: true }, function (event) {
          count++;
          event.handle.ack();
        });
        setTimeout(function () {
          bus.send('my.event.4', { my: Math.random() }, { ack: true });
          bus.send('my.event.4', { my: Math.random() }, { ack: true });
          bus.send('my.event.4', { my: Math.random() }, { ack: true });
          bus.send('my.event.4', { my: Math.random() }, { ack: true });
        }, 10);
      })
    });

    it('should use callback in confirm mode', function (done) {
      confirmBus.send('my.event.19', { my: 'event' }, {}, function (err, ok) {
        done(err);
      });
    });

    it('should use callback in confirm mode with options supplied', function (done) {
      confirmBus.send('my.event.19', { my: 'event' }, function (err, ok) {
        done(err);
      });
    });

    it('should throw error when using callback and not confirmsEnabled', function (done) {
      bus.send('my.event.15', { my: 'event' }, function (err, ok) {
        err.should.not.eql(null);
        err.message.should.eql('callbacks only supported when created with bus({ enableConfirms:true })');
        done();
      });
    });

    it('should allow ack:true and autodelete:true for sends', function (done) {
      var expectation = sinon.mock();
      bus.listen('my.event.25', { ack: true, autoDelete: true }, function () {
        expectation();
      });
      setTimeout(function () {
        bus.send('my.event.25', {}, {ack: true});
        setTimeout(function () {
          bus.unlisten('my.event.25').on('success', function () {
            setTimeout(function () {
              expectation.callCount.should.eql(1);
              bus.destroyListener('my.event.25', { force: true }).on('success', function () {
                done();
              });
            }, 100);
          });
        }, 100);
      }, 100);
    });

  });

//   describe('#unlisten', function() {

//     it('should cause message to not be received by listen', function (done){
//       var completed = false;
//       function tryDone () {
//         if (completed) return true;
//         completed = true;
//         done();
//       }
//       bus.listen('my.event.17', function (event) {
//         tryDone(new Error('should not receive events after unlisten'));
//       });
//       setTimeout(function () {
//         bus.unlisten('my.event.17').on('success', function () {
//           bus.send('my.event.17', { test: 'data'});
//           setTimeout(function () {
//             tryDone();
//           }, 100);
//         });
//       }, 1500);
//     });

//   });

//   describe('#destroyListener', function() {

//     it('should cause message to not be received by listen', function (done){
//       var completed = false;
//       function tryDone () {
//         if (completed) return true;
//         completed = true;
//         done();
//       }
//       bus.listen('my.event.18', { ack: true }, function (event) {
//         event.handle.ack();
//         tryDone(new Error('should not receive events after destroy'));
//       });
//       // setTimeout(function () {
//         bus.destroyListener('my.event.18').on('success', function () {
//           bus.send('my.event.18', { test: 'data'}, { ack: true, expiration: 100 });
//           setTimeout(tryDone, 100);
//         });
//       // }, 1500);
//     });

//   });
});
