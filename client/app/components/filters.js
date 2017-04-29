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
  },
};


export default function (ngModule) {
  ngModule.component('filters', FiltersComponent);
}
