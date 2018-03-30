import debug from 'debug';
import PubNub from 'pubnub';

const logger = debug('redash:services:PubNubSubscriber');

function PubNubFactory() {
  class PubNubSubscriber {
    constructor(key, channel) {
      this.callbacks = [];
      this.channel = channel;

      const pubnub = new PubNub({ subscribeKey: key });

      pubnub.addListener({
        status: (event) => {
          logger('[' + channel + ']', event);
        },
        message: (envelope) => {
          logger(envelope);
          this.callbacks.forEach(fn => fn(envelope));
        },
      });

      pubnub.subscribe({ channels: [channel] });
    }

    on(id, fn) {
      if (typeof fn === 'undefined') {
        this.callbacks.push(fn);
        return fn;
      }

      const cb = x => x.userMetadata.id === id && fn(x.message);
      this.callbacks.push(cb);
      return cb;
    }

    off(ref) {
      this.callbacks = this.callbacks.filter(x => x !== ref);
    }
  }

  return PubNubSubscriber;
}

export default function init(ngModule) {
  ngModule.factory('PubNubSubscriber', PubNubFactory);
}
