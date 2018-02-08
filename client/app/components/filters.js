import { includes } from 'underscore';
import template from './filters.html';

const FiltersComponent = {
  template,
  bindings: {
    onChange: '&',
    filters: '<',
  },
  controller() {
    'ngInject';

    this.filterChangeListener = (filter, modal) => {
      this.onChange({ filter, $modal: modal });
    };

    this.multiFilterChangeListener = (filter, modal) => {
      if (modal === '-') {
        filter.current = [];
      } else if (modal === '*') {
        filter.current = filter.values.slice(2);
      }

      this.onChange({ filter, $modal: modal });
    };

    this.itemGroup = item => (includes(['*', '-'], item) ? '' : 'Values');
  },
};


export default function init(ngModule) {
  ngModule.component('filters', FiltersComponent);
}
