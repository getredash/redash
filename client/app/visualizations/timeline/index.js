import d3 from 'd3';
import moment from 'moment';
import { _ } from 'underscore';
import { isNullOrUndefined } from 'util';
import { getColumnCleanName } from '@/services/query-result';
import template from './timeline.html';
import editorTemplate from './timeline-editor.html';

function TimelineRenderer(VisDataSet, VisOptions, clientConfig) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=?',
    },
    template,
    replace: false,
    controller($scope) {
      const colorScale = d3.scale.category10();

      // TODO: Move to separate module
      function buildTooltipTemplate(row) {
        let popoverTemplate = '<ul>';

        _.each($scope.options.tooltipItems, (column) => {
          const cleanColumn = getColumnCleanName(column);

          // Change nulls to empty strings
          const value = _.isNull(row[column]) ? '' : row[column];

          popoverTemplate += `<li><strong>${cleanColumn}: </strong>`;
          popoverTemplate += `${moment.isMoment(value) ? value.format(clientConfig.dateTimeFormat) : value}</li>`;
        });

        popoverTemplate += '</ul>';

        return popoverTemplate;
      }

      function getColorGroups(queryData) {
        let groups = [];

        if (isNullOrUndefined($scope.options.colorGroupBy)) {
          // Grouping disabled
          groups = ['All'];
        } else {
          // Grouping enabled
          groups = _.chain(queryData)
            .pluck($scope.options.colorGroupBy)
            .unique()
            .value();
        }

        // Assign each group a color. Use the configured one if it exists, otherwise give it a new one.
        const colors = _.map(groups, (group) => {
          if ($scope.options.colorGroups && $scope.options.colorGroups[group]) {
            return $scope.options.colorGroups[group];
          }
          return { background: colorScale(group) };
        });

        // Object used in the editor
        $scope.options.colorGroups = _.object(groups, colors);

        // Make style strings for each group
        const styles = _.map(colors, color => `color: black; background-color: ${color.background}; border-color: ${color.background};`);

        return _.object(groups, styles);
      }

      function getTimelineItems(queryData) {
        const timelineItems = [];
        const itemStyles = getColorGroups(queryData);

        _.each(queryData, (row) => {
          const content = row[$scope.options.content];
          const start = row[$scope.options.start];
          const end = row[$scope.options.end];
          const group = row[$scope.options.groupBy];
          const type = row[$scope.options.type];
          const colorGroup = isNullOrUndefined($scope.options.colorGroupBy) ? 'All' : row[$scope.options.colorGroupBy];

          // Skip rows where content is not a string, or start is not a date, or ...
          if (!_.isString(content) || !moment.isMoment(start) || (
            // End is mapped, allow nulls
            ((!isNullOrUndefined($scope.options.end) && end !== null) ||
            // Range or background is selected as default item type, and item has no individual type
            (['range', 'background'].includes($scope.options.timelineConfig.type) && isNullOrUndefined(type)) ||
            // Item type is range or background
            ['range', 'background'].includes(type))
            // ... and End is not a date
            && !moment.isMoment(end))) {
            return;
          }

          const item = {
            // Item label
            content,
            // Start date
            start: moment(start.format(clientConfig.dateTimeFormat), clientConfig.dateTimeFormat),
            // End date
            ...$scope.options.end && {
              end: moment.isMoment(end) ?
                moment(end.format(clientConfig.dateTimeFormat), clientConfig.dateTimeFormat) : end,
            },
            // Group
            ...$scope.options.groupBy && { group },
            // Tooltip content
            ...$scope.options.tooltipItems.length > 0 && { title: buildTooltipTemplate(row) },
            // Item styling
            style: itemStyles[colorGroup],
            // Item type must be a string, check if it's a valid type
            ..._.isString(type) && VisOptions.itemTypes.includes(type) && { type },
          };

          timelineItems.push(item);
        });

        return timelineItems;
      }

      function getTimelineGroups(queryData) {
        return _.chain(queryData)
          .pluck($scope.options.groupBy)
          .unique()
          .map(group => ({
            id: group,
            content: _.isNumber(group) ? group.toString() : group,
          }))
          .value();
      }

      function getTimelineData() {
        const queryData = $scope.queryResult.getData();

        if (queryData) {
          // Required fields
          if (isNullOrUndefined($scope.options.content) || isNullOrUndefined($scope.options.start)) return;

          $scope.timelineData = {
            items: new VisDataSet(getTimelineItems(queryData)),
            ...$scope.options.groupBy && { groups: new VisDataSet(getTimelineGroups(queryData)) },
          };
        }
      }

      const rendererTriggers = ['options.content', 'options.start', 'options.end', 'options.groupBy', 'options.type',
        'options.tooltipItems', 'options.colorGroupBy', 'options.timelineConfig.type', 'queryResult && queryResult.getData()'];

      $scope.$watchGroup(rendererTriggers, getTimelineData);
      $scope.$watch('options.colorGroups', getTimelineData, true);
    },
  };
}

function TimelineEditor(VisOptions) {
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
      function dynamicAccess(_obj, _props, _isSetter, _newValue, _errorValue) {
        // Make sure props is defined and not empty
        if (isNullOrUndefined(_props) || _props.length === 0) {
          return _errorValue;
        }

        // If the property list is in dot notation, convert to array
        if (_.isString(_props)) {
          _props = _props.split('.');
        }

        function dynamicAccessByArray(obj, propsArray, isSetter, newValue, errorValue) {
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
        }

        return dynamicAccessByArray(_obj, _props, _isSetter, _newValue, _errorValue);
      }

      // TODO: turn into a factory ?
      function getterSetterGenerator() {
        const generatorBlueprints = [
          { property: 'margin.axis', emptyValue: 0 },
          { property: 'margin.item.horizontal', emptyValue: 0 },
          { property: 'margin.item.vertical', emptyValue: 0 },
          { property: 'timeAxis.scale', emptyValue: undefined },
          { property: 'timeAxis.step', emptyValue: 1 },
          { property: 'type', emptyValue: '' },
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
      }

      getterSetterGenerator();

      $scope.alignOptions = VisOptions.alignOptions;
      $scope.axisOrientations = VisOptions.axisOrientations;
      $scope.axisScales = VisOptions.axisScales;
      $scope.itemOrientations = VisOptions.itemOrientations;
      $scope.itemTypes = VisOptions.itemTypes;
      $scope.overflowMethods = VisOptions.overflowMethods;
      $scope.zoomKeys = VisOptions.zoomKeys;
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
