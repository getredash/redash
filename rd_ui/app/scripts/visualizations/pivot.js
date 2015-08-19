'use strict';

(function () {
	var module = angular.module('redash.visualization');
	module.config(['VisualizationProvider', function (VisualizationProvider) {
	var renderTemplate = 
	'<pivot-renderer '  + 
	' options="visualization.options" query-result="queryResult"> ' +
	' </pivot-renderer>';	
	var editTemplate = '<pivot-editor></pivot-editor>';
	var defaultOptions = {};

	VisualizationProvider.registerVisualization({
	 type: 'PIVOT',
	 name: 'Pivot',
	 renderTemplate: renderTemplate,
	 editorTemplate: editTemplate,
	 defaultOptions: defaultOptions
	});
	}
]);
	  
	module.directive('pivotRenderer', function() {
		return {
			restrict: 'E',	
			template:'',
			replace: false,
			link: function($scope, element, attrs) {		
				$scope.$watch('[queryResult && queryResult.getData(), visualization.options]', 
				function (data) {
						var data = $scope.queryResult.getData();				
						if ($scope.queryResult.getData() == null) {
								return;
							}
							else {
							    var cols= $scope.visualization.options.cols || 'cols';
							    var rows= $scope.visualization.options.rows || 'rows';
                                var optionsTable = {"rows":rows, "cols":cols}
								var data = $.extend(true, [], $scope.queryResult.getData());
								$(element).pivotUI(data, optionsTable, true);					
							}
						}, true);
				}
		}
	});
          
	module.directive('pivotEditor', function() {
	return {
	 restrict: 'E',
	 templateUrl: '/views/visualizations/pivot_editor.html'
	}
	});
 
})();
