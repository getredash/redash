import { includes, without } from 'underscore';
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

    this.multiFilterSelectListener = (filter, modal) => {
      if (includes(['*', '-'], modal)) {
        filter.current = without([modal], '-');
      }

      this.onChange({ filter, $modal: modal });
    };

    this.itemGroup = item => (includes(['*', '-'], item) ? '' : 'Values');
  },
};


export default function init(ngModule) {
  ngModule.component('filters', FiltersComponent);
}
