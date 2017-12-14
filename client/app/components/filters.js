import { without } from 'underscore';
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

    this.itemGroup = (item) => {
      if (item === '*' || item === '-') {
        return '';
      }

      return 'Values';
    };

    this.filterExpandAllValue = (filter) => {
      if (filter.current[0] === '*') {
        filter.current = filter.values.slice(2);
      }
    };

    this.availableChoices = (filter) => {
      if (filter.current[0] === '*') {
        return [];
      }
      return without(filter.values, ...filter.current);
    };
  },
};


export default function init(ngModule) {
  ngModule.component('filters', FiltersComponent);
}
