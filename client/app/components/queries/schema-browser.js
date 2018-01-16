import template from './schema-browser.html';

function SchemaBrowserCtrl($rootScope, $scope) {
  'ngInject';

  this.showTable = (table) => {
    table.collapsed = !table.collapsed;
    $scope.$broadcast('vsRepeatTrigger');
  };

  this.getSize = (table) => {
    let size = 18;

    if (!table.collapsed) {
      size += 18 * table.columns.length;
    }

    return size;
  };

  this.isEmpty = function isEmpty() {
    return this.schema === undefined || this.schema.length === 0;
  };

  this.itemSelected = ($event, hierarchy) => {
    $rootScope.$broadcast('schema-browser-select', hierarchy);
    $event.preventDefault();
    $event.stopPropagation();
  };
}

const SchemaBrowser = {
  bindings: {
    schema: '<',
    onRefresh: '&',
  },
  controller: SchemaBrowserCtrl,
  template,
};

export default function init(ngModule) {
  ngModule.component('schemaBrowser', SchemaBrowser);
}
