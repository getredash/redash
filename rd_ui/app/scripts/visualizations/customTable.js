'use strict';

(function() {
  var tableVisualization = angular.module('redash.visualization');

  tableVisualization.config(['VisualizationProvider', function(VisualizationProvider) {
    var renderTemplate = '<customtable-renderer options="visualization.options" query-result="queryResult"></customtable-renderer>';
    var editTemplate = '<customtable-editor></customtable-editor>';
    var defaultOptions = {};

    VisualizationProvider.registerVisualization({
      type: 'CUSTOM TABLE',
      name: 'Custom Table',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }]);

  tableVisualization.directive('customtableRenderer', function() {
    return {
      restrict: 'E',
      templateUrl: "/views/customtable-renderer.html",
      replace: false,
      controller: ['$scope', '$filter', function($scope, $filter) {
        $scope.gridColumns = [];
        $scope.gridData = [];
        $scope.rowCollection = [].concat($scope.gridData);

        $scope.$watch('visualization.options',
          function(data) {
            if (!data) {
              return;
            }

            if ($scope.queryResult.getData() == null) {
              $scope.gridColumns = [];
              $scope.gridData = [];
              $scope.filters = [];
            } else {
              $scope.filters = $scope.queryResult.getFilters();

              // Takes columns from visualization options
              var cols = [];
              if ($scope.visualization.options.cols !== undefined) {
                cols = $scope.visualization.options.cols;
              }

              // This object will have the style for each columns
              // Hash with type (column, style)
              var columnStyle = {};
              // This object will have the visible property for each columns
              // Hash with type (column, boolean)
              var visibleColumn = {};
              // This object will have the visible property for each columns
              // Hash with type (column, inputLink)
              var columnLink = {};
              // For each column gets style, visible and inputLink
              _.forEach(cols, function(option) {
                var style = '';
                style += 'text-align:' + option.align + ';';
                if (option.bold) {
                  style += 'font-weight:bold;';
                } else {
                  style += 'font-weight:normal;';
                }
                if (option.italic) {
                  style += 'font-style:italic;';
                } else {
                  style += 'font-style:normal;';
                }
                /*if (option.color) {
                  style += 'color:' + option.chosenColor + ';';
                }*/
                columnStyle[option.column] = style;
                visibleColumn[option.column] = option.visible;
                columnLink[option.column] = option.link;
              });

              var prepareGridData = function(data) {
                var gridData = _.map(data, function(row) {

                  _.forEach(cols, function(option) {
                    // If there are option link and is visible renders the row
                    if (option.link && option.visible && option.inputLink.labels.length > 0) {
                      var string = option.inputLink.text;
                      _.forEach(option.inputLink.labels, function(label) {
                        string = string.replace('##' + label + '##', row[label]);
                      });
                      // Replaces the label for the link
                      row[option.column + 'link'] = string;

                      var visualLabel = option.inputLink.visualText;
                      _.forEach(option.inputLink.visualLabels, function(label) {
                        visualLabel = visualLabel.replace('##' + label + '##', row[label]);
                      });
                      // Replaces the label for the visual label
                      row[option.column + 'visualLabel'] = visualLabel;
                    }
                  })

                  var newRow = {};
                  _.each(row, function(val, key) {
                    newRow[$scope.queryResult.getColumnCleanName(key)] = val;
                  })
                  return newRow;
                });

                return gridData;
              };

              $scope.gridData = prepareGridData($scope.queryResult.getData());
              $scope.rowCollection = [].concat($scope.gridData);

              // For each columns set the properties to use on html
              $scope.gridColumns = _.map($scope.queryResult.getColumnCleanNames(), function(col, i) {
                var columnDefinition = {
                  'label': $scope.queryResult.getColumnFriendlyNames()[i],
                  'map': col,
                  'style': '',
                  'visible': true,
                  'link': false
                };

                if (visibleColumn[col] !== undefined) {
                  columnDefinition.visible = visibleColumn[col];
                }

                if (columnStyle[col] !== undefined) {
                  columnDefinition.style = columnStyle[col];
                }

                if (columnLink[col] !== undefined) {
                  columnDefinition.link = columnLink[col];
                }

                return columnDefinition;
              });

            }

          }, true);

      }]
    }
  })

  /** Directive that renders the custom table options. This options are listenned by a watcher and for every change,
   *  the smart-table.
   */
  tableVisualization.directive('customtableEditor', ['$modal', function($modal) {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/customtable_editor.html',
      link: function(scope, element, attrs) {

        scope.cols = [];

        // Initializes the columns options
        if (scope.visualization.options.cols === undefined) {
          var columnStyle = {};
          var visibleColumn = {};
          _.forEach(scope.queryResult.getColumnCleanNames(), function(item) {
            var obj = {};
            obj.column = item;
            obj.visible = true;
            obj.align = 'left';
            obj.bold = false;
            obj.italic = false;
            //obj.color = false;
            //obj.chosenColor = 'green';
            obj.link = false;
            obj.inputLink = {};
            obj.inputLink.text = '';
            obj.inputLink.labels = [];
            obj.inputLink.visualText = '';
            obj.inputLink.visualLabels = [];
            scope.cols.push(obj);
          });
        } else {
          scope.cols = scope.visualization.options.cols;
        }


        // Watches for every changing that occurs by the user
        scope.$watch('cols', function(newVal, oldVal) {
          if (newVal === oldVal) {
            return;
          }
          //console.log('table options changed');
          scope.visualization.options.cols = scope.cols;
          //optionsService.setOptions(scope.cols);
        }, true);

        /**
         * createLink Opens a new angular modal to edit the link
         * @param  {object} option  option object model with all the properties for this column
         */
        scope.createLink = function(option) {

          // Resets the link
          option.link = !option.link;
          option.inputLink.text = '';
          option.inputLink.labels = [];
          option.inputLink.visualText = '';
          option.inputLink.visualLabels = [];
          var inputLink = {};
          inputLink.text = '';
          inputLink.labels = [];
          inputLink.visualText = '';
          inputLink.visualLabels = [];

          if (option.link) {
            var modalInstance = $modal.open({
              templateUrl: 'myModalContent.html',
              controller: 'ModalInstanceCtrl',
              resolve: {
                columns: function() {
                  // Sends the column for the controller modal
                  return scope.queryResult.getColumnCleanNames();
                },
                inputLink: function() {
                  // Sends the current inputLink for the option
                  return inputLink;
                }
              }
            });

            modalInstance.result.then(function(inputLink) {
              // Refreshes the inputLink to this scope
              option.inputLink = inputLink;
            }, function() {
              option.link = false;
            });
          }
        }

        /**
         * updateLink Opens a new angular modal to update the link
         * @param  {object} option option object model with all the properties for this column
         */
        scope.updateLink = function(option) {

          var modalInstance = $modal.open({
            templateUrl: 'myModalContent.html',
            controller: 'ModalInstanceCtrl',
            resolve: {
              columns: function() {
                // Sends the column for the controller modal
                return scope.queryResult.getColumnCleanNames()
              },
              inputLink: function() {
                // Sends the current inputLink for the option
                return option.inputLink
              }
            }
          });

          modalInstance.result.then(function(inputLink) {
            // Refreshes the inputLink to this scope
            option.inputLink = inputLink;
          }, function() {});
        }
      }
    }
  }]);

  /**
   * Controller for the Modal. Lists all the columns table with a checkbox option and an input fot adding columns
   * on the column table.
   */
  tableVisualization.controller('ModalInstanceCtrl', function($scope, $modalInstance, columns, inputLink) {

    $scope.inputLink = {};
    $scope.inputLink.text = '';
    $scope.inputLink.labels = [];
    $scope.inputLink.visualText = '';
    $scope.inputLink.visualLabels = [];

    // If the input has persisted data, copies the previous inputLink options
    if (inputLink.labels.length > 0) {
      $scope.inputLink.text = inputLink.text;
      $scope.inputLink.labels = inputLink.labels;

      $scope.inputLink.visualText = inputLink.visualText;
      $scope.inputLink.visualLabels = inputLink.visualLabels;
    }

    $scope.columns = [];
    $scope.visuals = [];

    _.forEach(columns, function(column) {
      // First obj for link
      var obj = {};
      // Second obj for visual label
      var obj2 = {};
      // Copies the column map
      obj.label = column;
      obj2.label = column;
      // If has previous data, copies the labels that were added previously.
      var index = $scope.inputLink.labels.indexOf(column);
      if (index > -1) {
        obj.selected = true;
      } else {
        obj.selected = false;
      }
      // If has previous data, copies the labels that were added previously.
      var index2 = $scope.inputLink.visualLabels.indexOf(column);
      if (index2 > -1) {
        obj2.selected = true;
      } else {
        obj2.selected = false;
      }
      // Ads to each array
      $scope.columns.push(obj);
      $scope.visuals.push(obj2);
    });

    /**
     * getText Adds or removes the tag label 
     * @param  {object} column    column object model
     * @param  {string} inputText current text input
     * @return {string}           updated text
     */
    var getText = function(column, inputText) {
      var value = '##' + column.label + '##';
      if (column.selected) {
        inputText = inputText + value;
      } else {
        inputText = inputText.replace(value, '');
      }
      return inputText;
    };

    /**
     * getRefreshedLabels Update the labels array by adding or removing the label selected/unselected
     * @param  {object} column    column object model
     * @param  {array} labels     array of the current labels selected
     * @return {array}            updated array of labels
     */
    var getRefreshedLabels = function(column, labels) {
      var index = labels.indexOf(column.label);
      if (index > -1) {
        labels.splice(index, 1);
      } else {
        labels.push(column.label);
      }
      return labels;
    };

    /**
     * updateLinkText Logic to enabling or disabling the link association.
     * @param {object} column   column object model
     */
    $scope.updateLinkText = function(column) {
      column.selected = !column.selected;
      $scope.inputLink.text = getText(column, $scope.inputLink.text);
      $scope.inputLink.labels = getRefreshedLabels(column, $scope.inputLink.labels);
    }

    /**
     * updateVisualText Logic to enabling or disabling the visual association.
     * @param {object} column   column object model
     */
    $scope.updateVisualText = function(column) {
      column.selected = !column.selected;
      $scope.inputLink.visualText = getText(column, $scope.inputLink.visualText);
      $scope.inputLink.visualLabels = getRefreshedLabels(column, $scope.inputLink.visualLabels);
    }

    $scope.ok = function() {
      $modalInstance.close($scope.inputLink);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  });

}());