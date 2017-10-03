export default function VisualizationName(Visualization) {
  return {
    restrict: 'E',
    scope: {
      visualization: '=',
    },
    template: '{{name}}',
    replace: false,
    link(scope) {
      const currentType = scope.visualization.type;
      const nameByType = Visualization.visualizations[currentType].name;
      const currentName = scope.visualization.name;
      if (nameByType !== currentName) {
        scope.name = scope.visualization.name;
      }
    },
  };
}
