/* Column module */

function getNestedValue (obj, keys) {
  if (keys.length == 1) {
    return obj[keys[0]];
  }
  return getNestedValue(obj[keys[0]], keys.splice(1));
}

function getKeyFromObject(obj, key) {
  var value = obj[key];

  if ((!_.has(obj, key) && _.string.include(key, '.'))) {
    var keys = key.split(".");

    value = getNestedValue(obj, keys);
  }

  return value;
}

(function (global, angular) {
  "use strict";

  var smartTableColumnModule = angular.module('smartTable.column', ['smartTable.templateUrlList']).constant('DefaultColumnConfiguration', {
    isSortable: true,
    isEditable: false,
    type: 'text',


    //it is useless to have that empty strings, but it reminds what is available
    headerTemplateUrl: '',
    map: '',
    label: '',
    sortPredicate: '',
    formatFunction: '',
    formatParameter: '',
    filterPredicate: undefined,
    cellTemplateUrl: '',
    headerClass: '',
    cellClass: ''
  });

  function ColumnProvider(DefaultColumnConfiguration, templateUrlList) {

    function Column(config) {
      if (!(this instanceof Column)) {
        return new Column(config);
      }
      angular.extend(this, config);
    }

    this.setDefaultOption = function (option) {
      angular.extend(Column.prototype, option);
    };

    DefaultColumnConfiguration.headerTemplateUrl = templateUrlList.defaultHeader;
    this.setDefaultOption(DefaultColumnConfiguration);

    this.$get = function () {
      return Column;
    };
  }

  ColumnProvider.$inject = ['DefaultColumnConfiguration', 'templateUrlList'];
  smartTableColumnModule.provider('Column', ColumnProvider);

  //make it global so it can be tested
  global.ColumnProvider = ColumnProvider;
})(window, angular);


/* Directives */
(function (angular) {
  "use strict";

  angular.module('smartTable.directives', ['smartTable.templateUrlList', 'smartTable.templates'])
    .directive('smartTable', ['templateUrlList', 'DefaultTableConfiguration', function (templateList, defaultConfig) {
      return {
        restrict: 'EA',
        scope: {
          columnCollection: '=columns',
          dataCollection: '=rows',
          config: '='
        },
        replace: 'true',
        templateUrl: templateList.smartTable,
        controller: 'TableCtrl',
        link: function (scope, element, attr, ctrl) {

          var templateObject;

          scope.$watch('config', function (config) {
            var newConfig = angular.extend({}, defaultConfig, config),
              length = scope.columns !== undefined ? scope.columns.length : 0;

            ctrl.setGlobalConfig(newConfig);

            //remove the checkbox column if needed
            if (newConfig.selectionMode !== 'multiple' || newConfig.displaySelectionCheckbox !== true) {
              for (var i = length - 1; i >= 0; i--) {
                if (scope.columns[i].isSelectionColumn === true) {
                  ctrl.removeColumn(i);
                }
              }
            } else {
              //add selection box column if required
              ctrl.insertColumn({
                cellTemplateUrl: templateList.selectionCheckbox,
                headerTemplateUrl: templateList.selectAllCheckbox,
                isSelectionColumn: true
              }, 0);
            }
          }, true);

          //insert columns from column config
          //TODO add a way to clean all columns
          scope.$watchCollection('columnCollection', function (oldValue, newValue) {
            if (scope.columnCollection) {
              scope.columns.length = 0;
              for (var i = 0, l = scope.columnCollection.length; i < l; i++) {

                ctrl.insertColumn(scope.columnCollection[i]);
              }
            } else {
              //or guess data Structure
              if (scope.dataCollection && scope.dataCollection.length > 0) {
                templateObject = scope.dataCollection[0];
                angular.forEach(templateObject, function (value, key) {
                  if (key[0] != '$') {
                    ctrl.insertColumn({label: key, map: key});
                  }
                });
              }
            }
          }, true);

          //if item are added or removed into the data model from outside the grid
          scope.$watch('dataCollection', function (oldValue, newValue) {
            // evme:
            // reset sorting when data updates (executing query again)
            if (newValue) {
              ctrl.resetSort();
            }
          });

        }
      };
    }])
    //just to be able to select the row
    .directive('smartTableDataRow', function () {

      return {
        require: '^smartTable',
        restrict: 'C',
        link: function (scope, element, attr, ctrl) {

          element.bind('click', function () {
            scope.$apply(function () {
              ctrl.toggleSelection(scope.dataRow);
            })
          });
        }
      };
    })
    //header cell with sorting functionality or put a checkbox if this column is a selection column
    .directive('smartTableHeaderCell', function () {
      return {
        restrict: 'C',
        require: '^smartTable',
        link: function (scope, element, attr, ctrl) {
          element.bind('click', function () {
            scope.$apply(function () {
              ctrl.sortBy(scope.column);
            });
          })
        }
      };
    }).directive('smartTableSelectAll', function () {
      return {
        restrict: 'C',
        require: '^smartTable',
        link: function (scope, element, attr, ctrl) {
          element.bind('click', function (event) {
            ctrl.toggleSelectionAll(element[0].checked === true);
          })
        }
      };
    })
    //credit to Valentyn shybanov : http://stackoverflow.com/questions/14544741/angularjs-directive-to-stoppropagation
    .directive('stopEvent', function () {
      return {
        restrict: 'A',
        link: function (scope, element, attr) {
          element.bind(attr.stopEvent, function (e) {
            e.stopPropagation();
          });
        }
      }
    })
    //the global filter
    .directive('smartTableGlobalSearch', ['templateUrlList', function (templateList) {
      return {
        restrict: 'C',
        require: '^smartTable',
        scope: {
          columnSpan: '@'
        },
        templateUrl: templateList.smartTableGlobalSearch,
        replace: false,
        link: function (scope, element, attr, ctrl) {

          scope.searchValue = undefined;

          scope.$watch('searchValue', function (value) {
            //todo perf improvement only filter on blur ?
            ctrl.search(value);
          });
        }
      }
    }])
    //a customisable cell (see templateUrl) and editable
    //TODO check with the ng-include strategy
    .directive('smartTableDataCell', ['$filter', '$http', '$templateCache', '$compile', '$parse', '$sanitize', function (filter, http, templateCache, compile, parse, sanitize) {
      return {
        restrict: 'C',
        link: function (scope, element) {
          var
            column = scope.column,
            row = scope.dataRow,
            format = filter('format'),
            childScope;

          var value = getKeyFromObject(row, column.map);

          //can be useful for child directives
          scope.formatedValue = format(value, column.formatFunction, column.formatParameter);

          function defaultContent() {
            //clear content
            if (column.isEditable) {
              element.html('<div editable-cell="" row="dataRow" column="column" type="column.type"></div>');
              compile(element.contents())(scope);
            } else if (column.cellTemplate) {
              //create a scope
              childScope = scope.$new();
              //compile the element with its new content and new scope
              element.html(column.cellTemplate);
              compile(element.contents())(childScope);
            } else {
              if (typeof scope.formatedValue === 'string' || scope.formatedValue instanceof String) {
                element.html(sanitize(scope.formatedValue));
              } else {
                element.text(scope.formatedValue);
              }

            }
          }

          scope.$watch('column.cellTemplateUrl', function (value) {

            if (value) {
              //we have to load the template (and cache it) : a kind of ngInclude
              http.get(value, {cache: templateCache}).success(function (response) {

                //create a scope
                childScope = scope.$new();
                //compile the element with its new content and new scope
                element.html(response);
                compile(element.contents())(childScope);
              }).error(defaultContent);

            } else {
              defaultContent();
            }
          });
        }
      };
    }])
    //directive that allows type to be bound in input
    .directive('inputType', function () {
      return {
        restrict: 'A',
        priority: 1,
        link: function (scope, ielement, iattr) {
          //force the type to be set before inputDirective is called
          var type = scope.$eval(iattr.type);
          iattr.$set('type', type);
        }
      };
    })
    //an editable content in the context of a cell (see row, column)
    .directive('editableCell', ['templateUrlList', '$parse', function (templateList, parse) {
      return {
        restrict: 'EA',
        require: '^smartTable',
        templateUrl: templateList.editableCell,
        scope: {
          row: '=',
          column: '=',
          type: '='
        },
        replace: true,
        link: function (scope, element, attrs, ctrl) {
          var form = angular.element(element.children()[1]),
            input = angular.element(form.children()[0]);

          //init values
          scope.isEditMode = false;
          scope.value = scope.row[scope.column.map];


          scope.submit = function () {
            //update model if valid
            if (scope.myForm.$valid === true) {
              ctrl.updateDataRow(scope.row, scope.column.map, scope.value);
              ctrl.sortBy();//it will trigger the refresh...  (ie it will sort, filter, etc with the new value)
            }
            scope.toggleEditMode();
          };

          scope.toggleEditMode = function () {
            scope.value = scope.row[scope.column.map];
            scope.isEditMode = scope.isEditMode !== true;
          };

          scope.$watch('isEditMode', function (newValue, oldValue) {
            if (newValue) {
              input[0].select();
              input[0].focus();
            }
          });

          input.bind('blur', function () {
            scope.$apply(function () {
              scope.submit();
            });
          });
        }
      };
    }]);
})(angular);

/* Filters */
(function (angular) {
  "use strict";
  angular.module('smartTable.filters', []).
    constant('DefaultFilters', ['currency', 'date', 'json', 'lowercase', 'number', 'uppercase']).
    filter('format', ['$filter', 'DefaultFilters', function (filter, defaultfilters) {
      return function (value, formatFunction, filterParameter) {

        var returnFunction;

        if (formatFunction && angular.isFunction(formatFunction)) {
          returnFunction = formatFunction;
        } else {
          returnFunction = defaultfilters.indexOf(formatFunction) !== -1 ? filter(formatFunction) : function (value) {
            return value;
          };
        }
        return returnFunction(value, filterParameter);
      };
    }]);
})(angular);


/*table module */

(function (angular) {
  "use strict";
  angular.module('smartTable.table', ['smartTable.column', 'smartTable.utilities', 'smartTable.directives', 'smartTable.filters', 'ui.bootstrap.pagination.smartTable'])
    .constant('DefaultTableConfiguration', {
      selectionMode: 'none',
      isGlobalSearchActivated: false,
      displaySelectionCheckbox: false,
      isPaginationEnabled: true,
      itemsByPage: 10,
      maxSize: 5,

      //just to remind available option
      sortAlgorithm: '',
      filterAlgorithm: ''
    })
    .controller('TableCtrl', ['$scope', 'Column', '$filter', '$parse', 'ArrayUtility', 'DefaultTableConfiguration', function (scope, Column, filter, parse, arrayUtility, defaultConfig) {

      scope.columns = [];
      scope.dataCollection = scope.dataCollection || [];
      scope.displayedCollection = []; //init empty array so that if pagination is enabled, it does not spoil performances
      scope.numberOfPages = calculateNumberOfPages(scope.dataCollection);
      scope.currentPage = 1;
      scope.holder = {isAllSelected: false};

      var predicate = {},
        lastColumnSort;

      function isAllSelected() {
        var i,
          l = scope.displayedCollection.length;
        for (i = 0; i < l; i++) {
          if (scope.displayedCollection[i].isSelected !== true) {
            return false;
          }
        }
        return true;
      }

      function calculateNumberOfPages(array) {

        if (!angular.isArray(array)) {
          return 1;
        }
        if (array.length === 0 || scope.itemsByPage < 1) {
          return 1;
        }
        return Math.ceil(array.length / scope.itemsByPage);
      }

      function sortDataRow(array, column) {
        var sortAlgo = (scope.sortAlgorithm && angular.isFunction(scope.sortAlgorithm)) === true ? scope.sortAlgorithm : filter('orderBy');
        if (column) {
          var predicate = function (o) {
            return getKeyFromObject(o, column.sortPredicate);
          };
          return arrayUtility.sort(array, sortAlgo, predicate, column.reverse);
        } else {
          return array;
        }
      }

      function selectDataRow(array, selectionMode, index, select) {

        var dataRow, oldValue;

        if ((!angular.isArray(array)) || (selectionMode !== 'multiple' && selectionMode !== 'single')) {
          return;
        }

        if (index >= 0 && index < array.length) {
          dataRow = array[index];
          if (selectionMode === 'single') {
            //unselect all the others
            for (var i = 0, l = array.length; i < l; i++) {
              oldValue = array[i].isSelected;
              array[i].isSelected = false;
              if (oldValue === true) {
                scope.$emit('selectionChange', {item: array[i]});
              }
            }
          }
          dataRow.isSelected = select;
          scope.holder.isAllSelected = isAllSelected();
          scope.$emit('selectionChange', {item: dataRow});
        }
      }

      /**
       * set the config (config parameters will be available through scope
       * @param config
       */
      this.setGlobalConfig = function (config) {
        angular.extend(scope, defaultConfig, config);
      };

      /**
       * change the current page displayed
       * @param page
       */
      this.changePage = function (page) {
        var oldPage = scope.currentPage;
        if (angular.isNumber(page.page)) {
          scope.currentPage = page.page;
          scope.displayedCollection = this.pipe(scope.dataCollection);
          scope.holder.isAllSelected = isAllSelected();
          scope.$emit('changePage', {oldValue: oldPage, newValue: scope.currentPage});
        }
      };

      /**
       * set column as the column used to sort the data (if it is already the case, it will change the reverse value)
       * @method sortBy
       * @param column
       */
      this.sortBy = function (column) {
        var index = scope.columns.indexOf(column);
        if (index !== -1) {
          if (column.isSortable === true) {
            // reset the last column used
            if (lastColumnSort && lastColumnSort !== column) {
              lastColumnSort.reverse = 'none';
            }

            column.sortPredicate = column.sortPredicate || column.map;
            column.reverse = column.reverse !== true;
            lastColumnSort = column;
          }
        }

        scope.displayedCollection = this.pipe(scope.dataCollection);
      };

      /**
       * set the filter predicate used for searching
       * @param input
       * @param column
       */
      this.search = function (input, column) {
        //update column and global predicate
        if (column && scope.columns.indexOf(column) !== -1) {
          predicate.$ = '';
          column.filterPredicate = input;
        } else {
          for (var j = 0, l = scope.columns.length; j < l; j++) {
            scope.columns[j].filterPredicate = undefined;
          }
          predicate.$ = input;
        }

        for (var j = 0, l = scope.columns.length; j < l; j++) {
          predicate[scope.columns[j].map] = scope.columns[j].filterPredicate;
        }
        scope.displayedCollection = this.pipe(scope.dataCollection);

      };

      /**
       * combine sort, search and limitTo operations on an array,
       * @param array
       * @returns Array, an array result of the operations on input array
       */
      this.pipe = function (array) {
        var filterAlgo = (scope.filterAlgorithm && angular.isFunction(scope.filterAlgorithm)) === true ? scope.filterAlgorithm : filter('filter'),
          output;
        //filter and sort are commutative
        output = sortDataRow(arrayUtility.filter(array, filterAlgo, predicate), lastColumnSort);
        scope.numberOfPages = calculateNumberOfPages(output);
        return scope.isPaginationEnabled ? arrayUtility.fromTo(output, (scope.currentPage - 1) * scope.itemsByPage, scope.itemsByPage) : output;
      };

      this.resetSort = function () {
        lastColumnSort = null;
        predicate = {};
        this.sortBy();
      };

      /*////////////
       Column API
       ///////////*/


      /**
       * insert a new column in scope.collection at index or push at the end if no index
       * @param columnConfig column configuration used to instantiate the new Column
       * @param index where to insert the column (at the end if not specified)
       */
      this.insertColumn = function (columnConfig, index) {
        var column = new Column(columnConfig);
        arrayUtility.insertAt(scope.columns, index, column);
      };

      /**
       * remove the column at columnIndex from scope.columns
       * @param columnIndex index of the column to be removed
       */
      this.removeColumn = function (columnIndex) {
        arrayUtility.removeAt(scope.columns, columnIndex);
      };

      /**
       * move column located at oldIndex to the newIndex in scope.columns
       * @param oldIndex index of the column before it is moved
       * @param newIndex index of the column after the column is moved
       */
      this.moveColumn = function (oldIndex, newIndex) {
        arrayUtility.moveAt(scope.columns, oldIndex, newIndex);
      };


      /*///////////
       ROW API
       */

      /**
       * select or unselect the item of the displayedCollection with the selection mode set in the scope
       * @param dataRow
       */
      this.toggleSelection = function (dataRow) {
        var index = scope.dataCollection.indexOf(dataRow);
        if (index !== -1) {
          selectDataRow(scope.dataCollection, scope.selectionMode, index, dataRow.isSelected !== true);
        }
      };

      /**
       * select/unselect all the currently displayed rows
       * @param value if true select, else unselect
       */
      this.toggleSelectionAll = function (value) {
        var i = 0,
          l = scope.displayedCollection.length;

        if (scope.selectionMode !== 'multiple') {
          return;
        }
        for (; i < l; i++) {
          selectDataRow(scope.displayedCollection, scope.selectionMode, i, value === true);
        }
      };

      /**
       * remove the item at index rowIndex from the displayed collection
       * @param rowIndex
       * @returns {*} item just removed or undefined
       */
      this.removeDataRow = function (rowIndex) {
        var toRemove = arrayUtility.removeAt(scope.displayedCollection, rowIndex);
        arrayUtility.removeAt(scope.dataCollection, scope.dataCollection.indexOf(toRemove));
      };

      /**
       * move an item from oldIndex to newIndex in displayedCollection
       * @param oldIndex
       * @param newIndex
       */
      this.moveDataRow = function (oldIndex, newIndex) {
        arrayUtility.moveAt(scope.displayedCollection, oldIndex, newIndex);
      };

      /**
       * update the model, it can be a non existing yet property
       * @param dataRow the dataRow to update
       * @param propertyName the property on the dataRow ojbect to update
       * @param newValue the value to set
       */
      this.updateDataRow = function (dataRow, propertyName, newValue) {
        var index = scope.displayedCollection.indexOf(dataRow),
          oldValue;
        if (index !== -1) {
          oldValue = scope.displayedCollection[index][propertyName];
          if (oldValue !== newValue) {
            scope.displayedCollection[index][propertyName] = newValue;
            scope.$emit('updateDataRow', {item: scope.displayedCollection[index]});
          }
        }
      };


    }]);

})(angular);


angular.module('smartTable.templates', ['partials/defaultCell.html', 'partials/defaultHeader.html', 'partials/editableCell.html', 'partials/globalSearchCell.html', 'partials/pagination.html', 'partials/selectAllCheckbox.html', 'partials/selectionCheckbox.html', 'partials/smartTable.html']);

angular.module("partials/defaultCell.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/defaultCell.html",
    "{{formatedValue}}");
}]);

angular.module("partials/defaultHeader.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/defaultHeader.html",
    "<span class=\"header-content\" ng-class=\"{'sort-ascent':column.reverse==true,'sort-descent':column.reverse==false}\">{{column.label}}</span>");
}]);

angular.module("partials/editableCell.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/editableCell.html",
    "<div ng-dblclick=\"toggleEditMode($event)\">\n" +
    "    <span ng-hide=\"isEditMode\">{{value | format:column.formatFunction:column.formatParameter}}</span>\n" +
    "\n" +
    "    <form ng-submit=\"submit()\" ng-show=\"isEditMode\" name=\"myForm\">\n" +
    "        <input name=\"myInput\" ng-model=\"value\" type=\"type\" input-type/>\n" +
    "    </form>\n" +
    "</div>");
}]);

angular.module("partials/globalSearchCell.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/globalSearchCell.html",
    "<label>Search :</label>\n" +
    "<input type=\"text\" ng-model=\"searchValue\"/>");
}]);

angular.module("partials/pagination.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/pagination.html",
    "<ul class=\"pagination\">\n" +
    "        <li ng-repeat=\"page in pages\" ng-class=\"{active: page.active, disabled: page.disabled}\"><a\n" +
    "                ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
    "</ul> ");
}]);

angular.module("partials/selectAllCheckbox.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/selectAllCheckbox.html",
    "<input class=\"smart-table-select-all\"  type=\"checkbox\" ng-model=\"holder.isAllSelected\"/>");
}]);

angular.module("partials/selectionCheckbox.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/selectionCheckbox.html",
    "<input type=\"checkbox\" ng-model=\"dataRow.isSelected\" stop-event=\"click\"/>");
}]);

angular.module("partials/smartTable.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("partials/smartTable.html",
    "<table class=\"smart-table\">\n" +
    "    <thead>\n" +
    "    <tr class=\"smart-table-global-search-row\" ng-show=\"isGlobalSearchActivated\">\n" +
    "        <td class=\"smart-table-global-search\" column-span=\"{{columns.length}}\" colspan=\"{{columnSpan}}\">\n" +
    "        </td>\n" +
    "    </tr>\n" +
    "    <tr class=\"smart-table-header-row\">\n" +
    "        <th ng-repeat=\"column in columns\" ng-include=\"column.headerTemplateUrl\"\n" +
    "            class=\"smart-table-header-cell {{column.headerClass}}\" scope=\"col\">\n" +
    "        </th>\n" +
    "    </tr>\n" +
    "    </thead>\n" +
    "    <tbody>\n" +
    "    <tr ng-repeat=\"dataRow in displayedCollection\" ng-class=\"{selected:dataRow.isSelected}\"\n" +
    "        class=\"smart-table-data-row\">\n" +
    "        <td ng-repeat=\"column in columns\" class=\"smart-table-data-cell {{column.cellClass}}\"></td>\n" +
    "    </tr>\n" +
    "    </tbody>\n" +
    "    <tfoot ng-show=\"isPaginationEnabled\">\n" +
    "    <tr class=\"smart-table-footer-row\">\n" +
    "        <td class=\"text-center\" colspan=\"{{columns.length}}\">\n" +
    "            <div pagination-smart-table=\"\" num-pages=\"numberOfPages\" max-size=\"maxSize\" current-page=\"currentPage\"></div>\n" +
    "        </td>\n" +
    "    </tr>\n" +
    "    </tfoot>\n" +
    "</table>\n" +
    "\n" +
    "\n" +
    "");
}]);

(function (angular) {
  "use strict";
  angular.module('smartTable.templateUrlList', [])
    .constant('templateUrlList', {
      smartTable: 'partials/smartTable.html',
      smartTableGlobalSearch: 'partials/globalSearchCell.html',
      editableCell: 'partials/editableCell.html',
      selectionCheckbox: 'partials/selectionCheckbox.html',
      selectAllCheckbox: 'partials/selectAllCheckbox.html',
      defaultHeader: 'partials/defaultHeader.html',
      pagination: 'partials/pagination.html'
    });
})(angular);


(function (angular) {
  "use strict";
  angular.module('smartTable.utilities', [])

    .factory('ArrayUtility', function () {

      /**
       * remove the item at index from arrayRef and return the removed item
       * @param arrayRef
       * @param index
       * @returns {*}
       */
      var removeAt = function (arrayRef, index) {
          if (index >= 0 && index < arrayRef.length) {
            return arrayRef.splice(index, 1)[0];
          }
        },

        /**
         * insert item in arrayRef at index or a the end if index is wrong
         * @param arrayRef
         * @param index
         * @param item
         */
        insertAt = function (arrayRef, index, item) {
          if (index >= 0 && index < arrayRef.length) {
            arrayRef.splice(index, 0, item);
          } else {
            arrayRef.push(item);
          }
        },

        /**
         * move the item at oldIndex to newIndex in arrayRef
         * @param arrayRef
         * @param oldIndex
         * @param newIndex
         */
        moveAt = function (arrayRef, oldIndex, newIndex) {
          var elementToMove;
          if (oldIndex >= 0 && oldIndex < arrayRef.length && newIndex >= 0 && newIndex < arrayRef.length) {
            elementToMove = arrayRef.splice(oldIndex, 1)[0];
            arrayRef.splice(newIndex, 0, elementToMove);
          }
        },

        /**
         * sort arrayRef according to sortAlgorithm following predicate and reverse
         * @param arrayRef
         * @param sortAlgorithm
         * @param predicate
         * @param reverse
         * @returns {*}
         */
        sort = function (arrayRef, sortAlgorithm, predicate, reverse) {

          if (!sortAlgorithm || !angular.isFunction(sortAlgorithm)) {
            return arrayRef;
          } else {
            return sortAlgorithm(arrayRef, predicate, reverse === true);//excpet if reverse is true it will take it as false
          }
        },

        /**
         * filter arrayRef according with filterAlgorithm and predicate
         * @param arrayRef
         * @param filterAlgorithm
         * @param predicate
         * @returns {*}
         */
        filter = function (arrayRef, filterAlgorithm, predicate) {
          if (!filterAlgorithm || !angular.isFunction(filterAlgorithm)) {
            return arrayRef;
          } else {
            return filterAlgorithm(arrayRef, predicate);
          }
        },

        /**
         * return an array, part of array ref starting at min and the size of length
         * @param arrayRef
         * @param min
         * @param length
         * @returns {*}
         */
        fromTo = function (arrayRef, min, length) {

          var out = [],
            limit,
            start;

          if (!angular.isArray(arrayRef)) {
            return arrayRef;
          }

          start = Math.max(min, 0);
          start = Math.min(start, (arrayRef.length - 1) > 0 ? arrayRef.length - 1 : 0);

          length = Math.max(0, length);
          limit = Math.min(start + length, arrayRef.length);

          for (var i = start; i < limit; i++) {
            out.push(arrayRef[i]);
          }
          return out;
        };


      return {
        removeAt: removeAt,
        insertAt: insertAt,
        moveAt: moveAt,
        sort: sort,
        filter: filter,
        fromTo: fromTo
      };
    });
})(angular);


(function (angular) {
  angular.module('ui.bootstrap.pagination.smartTable', ['smartTable.templateUrlList'])

    .constant('paginationConfig', {
      boundaryLinks: false,
      directionLinks: true,
      firstText: 'First',
      previousText: '<',
      nextText: '>',
      lastText: 'Last'
    })

    .directive('paginationSmartTable', ['paginationConfig', 'templateUrlList', function (paginationConfig, templateUrlList) {
      return {
        restrict: 'EA',
        require: '^smartTable',
        scope: {
          numPages: '=',
          currentPage: '=',
          maxSize: '='
        },
        templateUrl: templateUrlList.pagination,
        replace: true,
        link: function (scope, element, attrs, ctrl) {

          // Setup configuration parameters
          var boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
          var directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$eval(attrs.directionLinks) : paginationConfig.directionLinks;
          var firstText = angular.isDefined(attrs.firstText) ? attrs.firstText : paginationConfig.firstText;
          var previousText = angular.isDefined(attrs.previousText) ? attrs.previousText : paginationConfig.previousText;
          var nextText = angular.isDefined(attrs.nextText) ? attrs.nextText : paginationConfig.nextText;
          var lastText = angular.isDefined(attrs.lastText) ? attrs.lastText : paginationConfig.lastText;

          // Create page object used in template
          function makePage(number, text, isActive, isDisabled) {
            return {
              number: number,
              text: text,
              active: isActive,
              disabled: isDisabled
            };
          }

          scope.$watch('numPages + currentPage + maxSize', function () {
            scope.pages = [];

            // Default page limits
            var startPage = 1, endPage = scope.numPages;

            // recompute if maxSize
            if (scope.maxSize && scope.maxSize < scope.numPages) {
              startPage = Math.max(scope.currentPage - Math.floor(scope.maxSize / 2), 1);
              endPage = startPage + scope.maxSize - 1;

              // Adjust if limit is exceeded
              if (endPage > scope.numPages) {
                endPage = scope.numPages;
                startPage = endPage - scope.maxSize + 1;
              }
            }

            // Add page number links
            for (var number = startPage; number <= endPage; number++) {
              var page = makePage(number, number, scope.isActive(number), false);
              scope.pages.push(page);
            }

            // Add previous & next links
            if (directionLinks) {
              var previousPage = makePage(scope.currentPage - 1, previousText, false, scope.noPrevious());
              scope.pages.unshift(previousPage);

              var nextPage = makePage(scope.currentPage + 1, nextText, false, scope.noNext());
              scope.pages.push(nextPage);
            }

            // Add first & last links
            if (boundaryLinks) {
              var firstPage = makePage(1, firstText, false, scope.noPrevious());
              scope.pages.unshift(firstPage);

              var lastPage = makePage(scope.numPages, lastText, false, scope.noNext());
              scope.pages.push(lastPage);
            }


            if (scope.currentPage > scope.numPages) {
              scope.selectPage(scope.numPages);
            }
          });
          scope.noPrevious = function () {
            return scope.currentPage === 1;
          };
          scope.noNext = function () {
            return scope.currentPage === scope.numPages;
          };
          scope.isActive = function (page) {
            return scope.currentPage === page;
          };

          scope.selectPage = function (page) {
            if (!scope.isActive(page) && page > 0 && page <= scope.numPages) {
              scope.currentPage = page;
              ctrl.changePage({page: page});
            }
          };
        }
      };
    }]);
})(angular);

