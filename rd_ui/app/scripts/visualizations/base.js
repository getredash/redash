(function () {
    var Visualization = function() {
        this.visualizations = {};
        this.visualizationTypes = {};

        this.registerVisualization = function(type, name, rendererTemplate, editorTemplate, defaultOptions, skipTypes) {
            var visualization = {
                rendererTemplate: rendererTemplate,
                editorTemplate: editorTemplate,
                type: type,
                name: name,
                defaultOptions: defaultOptions || {}
            };

            // TODO: this is prone to errors; better refactor.
            if (_.isEmpty(this.visualizations)) {
                this.defaultVisualization = visualization;
            }

            this.visualizations[type] = visualization;

            if (!skipTypes) {
                this.visualizationTypes[name] = type;
            };
        };

        this.getSwitchTemplate = function(property) {
            var pattern = /(<[a-zA-Z0-9-]*? )/

            var mergedTemplates = _.reduce(this.visualizations, function(templates, visualization) {
                if (visualization[property]) {
                    var ngSwitch = '$1ng-switch-when="' + visualization.type + '" ';
                    var template = visualization[property].replace(pattern, ngSwitch);

                    return templates + "\n" + template;
                }

                return templates;
            }, "");

            mergedTemplates = '<div ng-switch on="visualization.type">'+ mergedTemplates + "</div>";

            return mergedTemplates;
        }

        this.$get = ['$resource', function($resource) {
            var Visualization = $resource('/api/visualizations/:id', {id: '@id'});
            Visualization.visualization = this.visualizations;
            Visualization.visualizationTypes = this.visualizationTypes;
            Visualization.renderVisualizationsTemplate = this.getSwitchTemplate('rendererTemplate');
            Visualization.editorTemplate = this.getSwitchTemplate('editorTemplate');
            Visualization.defaultVisualization = this.defaultVisualization;

            return Visualization;
        }];
    };

    var VisualizationRenderer = function(Visualization) {
        return {
            restrict: 'E',
            scope: {
                visualization: '=',
                queryResult: '='
            },
            // TODO: using switch here (and in the options editor) might introduce errors and bad
            // performance wise. It's better to eventually show the correct template based on the
            // visualization type and not make the browser render all of them.
            template: Visualization.renderVisualizationsTemplate,
            replace: false
        }
    };

    var VisualizationOptionsEditor = function(Visualization) {
        return {
            restrict: 'E',
            template: Visualization.editorTemplate,
            replace: false
        }
    };

    var EditVisualizationForm = function(Visualization, growl) {
        return {
            restrict: 'E',
            templateUrl: '/views/visualizations/edit_visualization.html',
            replace: true,
            scope: {
                query: '=',
                visualization: '=?'
            },
            link: function (scope, element, attrs) {
                scope.visTypes = Visualization.visualizationTypes;

                if (!scope.visualization) {
                    // create new visualization
                    // wait for query to load to populate with defaults
                    var unwatch = scope.$watch('query', function (q) {
                        if (q && q.id) {
                            unwatch();
                            scope.visualization = {
                                'query_id': q.id,
                                'type': Visualization.defaultVisualization.type,
                                'name': '',
                                'description': q.description || '',
                                'options': Visualization.defaultVisualization.defaultOptions
                            };
                        }
                    }, true);
                }

                scope.$watch('visualization.type', function (type) {
                    // if not edited by user, set name to match type
                    if (type && scope.visualization && !scope.visForm.name.$dirty) {
                        // poor man's titlecase
                        scope.visualization.name = scope.visualization.type[0] + scope.visualization.type.slice(1).toLowerCase();
                    }
                });

                scope.submit = function () {
                    Visualization.save(scope.visualization, function success(result) {
                        growl.addSuccessMessage("Visualization saved");

                        scope.visualization = result;

                        var visIds = _.pluck(scope.query.visualizations, 'id');
                        var index = visIds.indexOf(result.id);
                        if (index > -1) {
                            scope.query.visualizations[index] = result;
                        } else {
                            scope.query.visualizations.push(result);
                        }
                    }, function error() {
                        growl.addErrorMessage("Visualization could not be saved");
                    });
                };
            }
        }
    };

    angular.module('redash.visualization', [])
        .provider('Visualization', Visualization)
        .directive('visualizationRenderer', ['Visualization', VisualizationRenderer])
        .directive('visualizationOptionsEditor', ['Visualization', VisualizationOptionsEditor])
        .directive('editVisulatizationForm', ['Visualization', 'growl', EditVisualizationForm])
})();
