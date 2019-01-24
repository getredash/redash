import recordEvent from '@/lib/recordEvent';

export let Events = null; // eslint-disable-line import/no-mutable-exports

function EventsService() {
  this.record = recordEvent;
}

export default function init(ngModule) {
  ngModule.service('Events', EventsService);

  ngModule.run(($injector) => {
    Events = $injector.get('Events');
  });
}

init.init = true;
