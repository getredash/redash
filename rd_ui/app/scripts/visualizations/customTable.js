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

  tableVisualization.directive('customtableRenderer', function($location) {
    return {
      restrict: 'E',
      templateUrl: "/views/customtable-renderer.html",
      replace: false,
      controller: ['$scope', '$filter', 'Parameters', function($scope, $filter, Parameters) {
        $scope.gridColumns = [];
        $scope.gridData = [];
        $scope.rowCollection = [].concat($scope.gridData);

        /**
         * generateHref Compares params from url and row and replaces the value of param if existing on both sides.
         * @param  {Object} urlParams params from url
         * @param  {Object} rowParams params from row
         * @return {String}           return the string link to be added on href row
         */
        var generateHref = function(urlParams, rowParams) {
          var staticParameters = Parameters.getStaticParameters();
          var parameters = '';
          _.forEach(staticParameters, function(param) {
            if (urlParams[param] !== undefined) {
              if (rowParams[param] !== undefined) {
                parameters = parameters + '&' + param + '=' + rowParams[param];
              } else {
                parameters = parameters + '&' + param + '=' + urlParams[param];
              }
            }
          });
          for (var propertyName in rowParams) {
            if (parameters.indexOf(propertyName) < 0) {
              parameters = parameters + '&' + propertyName + '=' + rowParams[propertyName];
            }
          }
          var result = '?' + parameters.substring(1);
          return result;
        }

        $scope.$watch('[queryResult && queryResult.getData(), visualization.options]',
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

              var columnExtras = {};
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
                columnExtras[option.column] = option.extraTags;
              });

              var prepareGridData = function(data) {
                var gridData = _.map(data, function(row) {
                  _.forEach(cols, function(option) {

                    // If there are option link and is visible renders the row
                    if (option.link && option.visible) {
                      var string = option.inputLink.text;
                      var visualLabel = option.inputLink.visualText;

                      // Parameters logic
                      var parameters = '';
                      // If check parameters option is enabled to take from url
                      if (option.inputLink.parameters) {
                        var params = Parameters.getParameters();
                      }
                      if (string !== undefined) {
                        _.forEach($scope.queryResult.getColumnCleanNames(), function(label) {
                          //string = string.replace('##' + label + '##', row[label]);
                          string = string.replace(new RegExp('##' + label + '##', 'g'), row[label]);
                          //visualLabel = visualLabel.replace('/##' + label + '##/'g, row[label]);
                          visualLabel = visualLabel.replace(new RegExp('##' + label + '##', 'g'), row[label]);
                        });
                        var uri = new URI(string);
                        var cleanedParams = uri.search(true);
                        // Replaces the label for the link
                        row[option.column + 'link'] = generateHref(params, cleanedParams);
                        row[option.column + 'visualLabel'] = visualLabel;

                      }
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
                  'link': false,
                  'extraTags': ''
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

                if (columnExtras[col] !== undefined) {
                  columnDefinition.extraTags = columnExtras[col];
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
            obj.parameters = true;
            obj.inputLink.visualText = '';
            obj.extraTags = '';
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
          var extraTags = '';
          var inputLink = {};
          inputLink.text = '';
          inputLink.parameters = true;
          inputLink.visualText = '';

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
                },
                extraTags: function() {
                  return extraTags;
                }
              }
            });

            modalInstance.result.then(function(result) {
              // Refreshes the inputLink to this scope
              option.inputLink = result.inputLink;
              // Refreshes the extraTags to this scope
              option.extraTags = result.extraTags;
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
              },
              extraTags: function() {
                return option.extraTags;
              }
            }
          });

          modalInstance.result.then(function(result) {
            // Refreshes the inputLink to this scope
            option.inputLink = result.inputLink;
            // Refreshes the extraTags to this scope
            option.extraTags = result.extraTags;
          }, function() {});
        }
      }
    }
  }]);

  /**
   * Controller for the Modal. Lists all the columns table with a checkbox option and an input fot adding columns
   * on the column table.
   */
  tableVisualization.controller('ModalInstanceCtrl', function($scope, $modalInstance, columns, inputLink, extraTags) {

    $scope.inputLink = {};

    $scope.inputLink.text = inputLink.text;
    $scope.inputLink.parameters = inputLink.parameters;
    $scope.inputLink.visualText = inputLink.visualText;
    $scope.extraTags = extraTags;

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
     * updateLinkText Logic to enabling or disabling the link association.
     * @param {object} column   column object model
     */
    $scope.updateLinkText = function(column) {
      var value = '##' + column.label + '##';
      $scope.inputLink.text = $scope.inputLink.text + value;
    }

    /**
     * updateVisualText Logic to enabling or disabling the visual association.
     * @param {object} column   column object model
     */
    $scope.updateVisualText = function(column) {
      var value = '##' + column.label + '##';
      $scope.inputLink.visualText = $scope.inputLink.visualText + value;
    }

    $scope.ok = function() {
      var result = {};
      result.inputLink = $scope.inputLink;
      result.extraTags = $scope.extraTags;
      $modalInstance.close(result);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  });

  tableVisualization.directive("extraTags", function() {
    return {
      compile: function(tElm, tAttrs) {
        return function(scope, elm) {
          if (scope.column.extraTags.length > 0) {
            var arrStr = scope.column.extraTags.split('##');
            for (var i = 0; i < arrStr.length; i++) {
              var tags = arrStr[i].split('=');
              var attr = tags[0];
              var value = tags[1];
              elm.attr(attr, value);
            }
          }
        };
      }
    };
  });

}());