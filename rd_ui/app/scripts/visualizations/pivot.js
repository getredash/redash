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
				$scope.visualization.options.cols = 
				$scope.visualization.options.rows = 
						
				$scope.$watch('[queryResult && queryResult.getData(), visualization.options]', 
				function (data) {
						var data = $scope.queryResult.getData();				
						if (!data) {
								return;
							}
							else {
								var data = $.extend(true, [], $scope.queryResult.getData());	
							     var cols= $scope.visualization.options.cols || 'cols';
							     var rows= $scope.visualization.options.rows || 'rows';
                                 var options = {"rows":rows, "cols":cols}
		
								$(element).pivotUI(data, options, true);						
							}
						});
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
