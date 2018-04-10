import { isMoment } from 'moment';
import { _ } from 'underscore';
import { isNullOrUndefined } from 'util';
import { getColumnCleanName } from '@/services/query-result';
import template from './timeline.html';
import editorTemplate from './timeline-editor.html';

function TimelineRenderer(VisDataSet, clientConfig) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=?',
    },
    template,
    replace: false,
    controller($scope) {
      // TODO: Move to separate module
      function nullToEmptyString(value) {
        if (value !== null) {
          return value;
        }
        return '';
      }

      // TODO: Move to separate module
      function buildTooltipTemplate(row) {
        let popoverTemplate = '<ul>';

        _.each($scope.options.tooltipItems, (column) => {
          const cleanColumn = getColumnCleanName(column);
          const value = row[column];

          popoverTemplate += `<li><strong>${cleanColumn}: </strong>`;
          popoverTemplate += `${isMoment(value) ? value.format(clientConfig.dateTimeFormat) : nullToEmptyString(value)}</li>`;
        });

        popoverTemplate += '</ul>';

        return popoverTemplate;
      }

      const getTimelineItems = (queryData) => {
        const timelineItems = [];

        _.each(queryData, (row) => {
          const content = row[$scope.options.content];
          const start = row[$scope.options.start];
          const end = row[$scope.options.end];
          const group = row[$scope.options.groupBy];

          // Skip rows where content is not a string, or start/end are non-dates
          if (!_.isString(content) || !isMoment(start) ||
            (!isNullOrUndefined($scope.options.end) && end !== null && !isMoment(end))) {
            return;
          }

          const item = {
            content,
            start,
            ...$scope.options.end && { end },
            ...$scope.options.groupBy && { group },
            ...$scope.options.tooltipItems.length > 0 && { title: buildTooltipTemplate(row) },
          };

          timelineItems.push(item);
        });

        return timelineItems;
      };

      const getTimelineGroups = (queryData) => {
        const groupBy = $scope.options.groupBy;

        if (!isNullOrUndefined(groupBy)) {
          return _.chain(queryData)
            .pluck(groupBy)
            .unique()
            .map(group => ({
              id: group,
              content: _.isNumber(group) ? group.toString() : group,
            }))
            .value();
        }

        return [];
      };

      const getTimelineData = () => {
        const queryData = $scope.queryResult.getData();

        if (queryData) {
          // Required fields
          if (isNullOrUndefined($scope.options.content) || isNullOrUndefined($scope.options.start)) return;

          $scope.timelineData = {
            items: new VisDataSet(getTimelineItems(queryData)),
            ...$scope.options.groupBy && { groups: new VisDataSet(getTimelineGroups(queryData)) },
          };
        }
      };

      $scope.$watch('queryResult && queryResult.getData()', getTimelineData);
      $scope.$watchGroup(['options.content', 'options.start', 'options.end', 'options.groupBy', 'options.tooltipItems'], getTimelineData);
    },
  };
}

function TimelineEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
    link($scope) {
      $scope.currentTab = 'general';
      $scope.columns = $scope.queryResult.getColumns();
      $scope.columnNames = _.pluck($scope.columns, 'name');
      $scope.getterSetters = {};

      // TODO: Move to its own package for reusability
      // Taken from https://github.com/joshuacc/drabs
      // Modified by Andros Rosa to also support setting properties
      const dynamicAccess = (_obj, _props, _isSetter, _newValue, _errorValue) => {
        // Make sure props is defined and not empty
        if (isNullOrUndefined(_props) || _props.length === 0) {
          return _errorValue;
        }

        // If the property list is in dot notation, convert to array
        if (_.isString(_props)) {
          _props = _props.split('.');
        }

        const dynamicAccessByArray = (obj, propsArray, isSetter, newValue, errorValue) => {
          // Parent properties are invalid... exit with error message
          if (isNullOrUndefined(obj)) {
            return errorValue;
          }

          // the path array has only 1 more element (the target property)
          if (propsArray.length === 1) {
            // Update property if called as setter
            if (isSetter) {
              obj[propsArray[0]] = newValue;
            }
            return obj[propsArray[0]];
          }

          // Prepare our found property and path array for recursion
          const foundSoFar = obj[propsArray[0]];
          const remainingProps = _.rest(propsArray);

          return dynamicAccessByArray(foundSoFar, remainingProps, isSetter, newValue, errorValue);
        };

        return dynamicAccessByArray(_obj, _props, _isSetter, _newValue, _errorValue);
      };

      // TODO: turn into a factory ?
      const getterSetterGenerator = () => {
        const generatorBlueprints = [
          {
            property: 'margin.axis',
            emptyValue: 0,
          },
          {
            property: 'margin.item.horizontal',
            emptyValue: 0,
          },
          {
            property: 'margin.item.vertical',
            emptyValue: 0,
          },
          {
            property: 'timeAxis.scale',
            emptyValue: undefined,
          },
          {
            property: 'timeAxis.step',
            emptyValue: 1,
          },
          {
            property: 'type',
            emptyValue: '',
          },
        ];

        _.each(generatorBlueprints, (blueprint) => {
          const getterSetter = (newValue) => {
            let option = dynamicAccess($scope.visualization.options.timelineConfig, blueprint.property);

            // Called as a setter
            if (!_.isUndefined(newValue)) {
              // Switch null to custom empty value
              const finalValue = _.isNull(newValue) ? blueprint.emptyValue : newValue;
              option = dynamicAccess($scope.visualization.options.timelineConfig, blueprint.property, true, finalValue);
            }
            return option;
          };

          // Save getter/setter in scope object
          $scope.getterSetters[blueprint.property] = getterSetter;
        });
      };

      getterSetterGenerator();

      $scope.alignOptions = [
        'auto',
        'center',
        'left',
        'right',
      ];

      $scope.axisOrientations = [
        'top',
        'bottom',
        'both',
        'none',
      ];

      $scope.axisScales = [
        'millisecond',
        'second',
        'minute',
        'hour',
        'weekday',
        'week',
        'day',
        'month',
        'year',
      ];

      $scope.itemOrientations = [
        'top',
        'bottom',
      ];

      $scope.itemTypes = [
        'box',
        'point',
        'range',
        'background',
      ];

      $scope.overflowMethods = [
        'cap',
        'flip',
      ];

      $scope.zoomKeys = [
        { name: 'None', value: '' },
        { name: 'Alt', value: 'altKey' },
        { name: 'Control (Ctrl)', value: 'ctrlKey' },
        { name: 'Meta', value: 'metaKey' },
      ];
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('timelineRenderer', TimelineRenderer);
  ngModule.directive('timelineEditor', TimelineEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate = '<timeline-renderer options="visualization.options" query-result="queryResult"></timeline-renderer>';
    const editTemplate = '<timeline-editor></timeline-editor>';

    const defaultOptions = {
      timelineConfig: {
        align: 'auto',
        clickToUse: false,
        horizontalScroll: false,
        margin: {
          axis: 20,
          item: {
            horizontal: 10,
            vertical: 10,
          },
        },
        moveable: true,
        orientation: {
          axis: 'bottom',
          item: 'bottom',
        },
        showCurrentTime: true,
        showTooltips: true,
        stack: true,
        timeAxis: {
          scale: undefined,
          step: 1,
        },
        tooltip: {
          followMouse: false,
          overflowMethod: 'flip',
        },
        type: '',
        zoomable: true,
        zoomKey: '',
      },
      tooltipItems: [],
    };

    VisualizationProvider.registerVisualization({
      type: 'TIMELINE',
      name: 'Timeline',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
