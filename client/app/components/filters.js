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
  },
};


export default function init(ngModule) {
  ngModule.component('filters', FiltersComponent);
}
