import { debounce, extend } from 'lodash';
import { $http } from '@/services/ng';

export let Events = null; // eslint-disable-line import/no-mutable-exports

let events = [];

const sendEvents = debounce(() => {
  const eventsToSend = events;
  events = [];

  $http.post('api/events', eventsToSend);
}, 1000);

function EventsService() {
  this.record = (action, objectType, objectId, additionalProperties) => {
    const event = {
      action,
      object_type: objectType,
      object_id: objectId,
      timestamp: Date.now() / 1000.0,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
    };
    extend(event, additionalProperties);
    events.push(event);
    sendEvents();
  };
}

export default function init(ngModule) {
  ngModule.service('Events', EventsService);

  ngModule.run(($injector) => {
    Events = $injector.get('Events');
  });
}

init.init = true;
