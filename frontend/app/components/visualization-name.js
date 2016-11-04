function VisualizationName(Visualization) {
  return {
    restrict: 'E',
    scope: {
      visualization: '=',
    },
    template: '{{name}}',
    replace: false,
    link(scope) {
      if (Visualization.visualizations[scope.visualization.type].name !== scope.visualization.name) {
        scope.name = scope.visualization.name;
      }
    },
  };
}
