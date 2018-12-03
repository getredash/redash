import recordEvent from '@/lib/recordEvent';

function Events() {
  this.record = (action, objectType, objectId, additionalProperties) => {
    recordEvent(action, objectType, objectId, additionalProperties);
  };
}

export default function init(ngModule) {
  ngModule.service('Events', Events);
}

init.init = true;
