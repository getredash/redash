import { debounce } from 'underscore';

function Events($http) {
  this.events = [];

  this.post = debounce(() => {
    const events = this.events;
    this.events = [];

    $http.post('api/events', events);
  }, 1000);

  this.record = function record(action, objectType, objectId, additionalProperties) {
    const event = {
      action,
      object_type: objectType,
      object_id: objectId,
      timestamp: Date.now() / 1000.0,
    };
    Object.assign(event, additionalProperties);
    this.events.push(event);

    this.post();
  };
}

export default function init(ngModule) {
  ngModule.service('Events', Events);
}
