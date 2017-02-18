import template from './schema-browser.html';

function SchemaBrowserCtrl($scope) {
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
}

const SchemaBrowser = {
  bindings: {
    schema: '<',
  },
  controller: SchemaBrowserCtrl,
  template,
};

export default function (ngModule) {
  ngModule.component('schemaBrowser', SchemaBrowser);
}
