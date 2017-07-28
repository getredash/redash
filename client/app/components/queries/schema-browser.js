import template from './schema-browser.html';

function SchemaBrowserCtrl($rootScope, $scope) {
  'ngInject';

  this.versionToggle = false;
  this.versionFilter = 'abcdefghijklmnop';

  this.showTable = (table) => {
    table.collapsed = !table.collapsed;
    $scope.$broadcast('vsRepeatTrigger');
  };

  $scope.showSchemaInfo = false;
  $scope.openSchemaInfo = ($event, tableName, tableMetadata) => {
    $scope.tableName = tableName;
    $scope.tableMetadata = tableMetadata;
    $scope.showSchemaInfo = true;
    $event.stopPropagation();
  };
  $scope.closeSchemaInfo = () => {
    $scope.$apply(() => { $scope.showSchemaInfo = false; });
  };

  this.getSize = (table) => {
    let size = 22;

    if (!table.collapsed) {
      size += 18 * table.columns.length;
    }

    return size;
  };

  this.isEmpty = function isEmpty() {
    return this.schema === undefined || this.schema.length === 0;
  };
  this.flipToggleVersionedTables = (versionToggle, toggleString) => {
    if (versionToggle === false) {
      this.versionToggle = true;
      this.versionFilter = toggleString;
    } else {
      this.versionToggle = false;
      this.versionFilter = 'abcdefghijklmnop';
    }
  };

  this.itemSelected = ($event, hierarchy) => {
    $rootScope.$broadcast('query-editor.command', 'paste', hierarchy.join('.'));
    $event.preventDefault();
    $event.stopPropagation();
  };

  this.splitFilter = (filter) => {
    filter = filter.replace(/ {2}/g, ' ');
    if (filter.includes(' ')) {
      const splitTheFilter = filter.split(' ');
      this.schemaFilterObject = { name: splitTheFilter[0], columns: splitTheFilter[1] };
      this.schemaFilterColumn = splitTheFilter[1];
    } else {
      this.schemaFilterObject = filter;
      this.schemaFilterColumn = '';
    }
  };
}

const SchemaBrowser = {
  bindings: {
    schema: '<',
    tabletogglestring: '<',
    onRefresh: '&',
    flipToggleVersionedTables: '&',
  },
  controller: SchemaBrowserCtrl,
  template,
};

export default function init(ngModule) {
  ngModule.component('schemaBrowser', SchemaBrowser);
}

init.init = true;
