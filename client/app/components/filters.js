import template from './filters.html';

const NewFiltersComponent = {
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
  ngModule.component('newFilters', NewFiltersComponent);
}
