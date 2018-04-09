/*  Credits to https://github.com/visjs/angular-visjs for this angular module.

    Partially modified by Andros Rosa:
      - Updated to ES6.
      - Export module.
      - Events are now optional.
      - Support timelines without groups.
      - Deeply watch options object.
      - Deleted other directives for other types of visualizations. */

import angular from 'angular';
import vis from 'vis';
import 'vis/dist/vis-timeline-graph2d.min.css';
import { isNullOrUndefined } from 'util';

function VisDataSet() {
  return (data, options) =>
    // Create a new DataSet object
    new vis.DataSet(data, options);
}

function VisTimeline() {
  return {
    restrict: 'EA',
    transclude: false,
    scope: {
      data: '=',
      options: '=',
      events: '=?',
    },
    link(scope, element) {
      const timelineEvents = [
        'rangechange',
        'rangechanged',
        'timechange',
        'timechanged',
        'select',
        'doubleClick',
        'click',
        'contextmenu',
      ];

      // Declare the timeline
      let timeline = null;

      const refreshTimeline = () => {
        // Sanity check
        if (scope.data == null) {
          return;
        }

        // If we've actually changed the data set, then recreate the graph
        // We can always update the data by adding more data to the existing data set
        if (timeline != null) {
          timeline.destroy();
        }

        // Initialize the timeline
        if (isNullOrUndefined(scope.data.groups)) {
          // Timeline without groups
          timeline = new vis.Timeline(element[0], scope.data.items, scope.options);
        } else {
          // Timeline with groups
          timeline = new vis.Timeline(element[0], scope.data.items, scope.data.groups, scope.options);
        }

        // Attach an event handler if defined
        if (!isNullOrUndefined(scope.events)) {
          angular.forEach(scope.events, (callback, event) => {
            if (timelineEvents.indexOf(String(event)) >= 0) {
              timeline.on(event, callback);
            }
          });

          // onLoad callback
          if (!isNullOrUndefined(scope.events.onload) && angular.isFunction(scope.events.onload)) {
            scope.events.onload(timeline);
          }
        }
      };

      const updateOptions = (newOptions) => {
        if (timeline === null) return;

        // Update timeline options
        timeline.setOptions(newOptions);
      };

      scope.$watch('data', refreshTimeline);
      scope.$watch('options', updateOptions, true);
    },
  };
}

const ngVis = angular.module('ngVis', [])
  .factory('VisDataSet', VisDataSet)
  .directive('visTimeline', VisTimeline);

export default ngVis;
