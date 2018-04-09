/* eslint-disable */

/*  Credits to https://github.com/visjs/angular-visjs for this angular module.

    Partially modified by Andros Rosa:
      - Events are now optional.
      - Support timelines without groups.
      - Deeply watch options object.
      - Deleted other directives for other types of visualizations. */

import angular from 'angular';
import vis from 'vis';
import 'vis/dist/vis-timeline-graph2d.min.css';
import { _ } from 'underscore';
import { isNullOrUndefined } from 'util';

angular.module('ngVis', [])

  .factory('VisDataSet', function () {
    'use strict';

    return function (data, options) {
      // Create the new dataSets
      return new vis.DataSet(data, options);
    };
  })

  /**
   * TimeLine directive
   */
  .directive('visTimeline', function () {
    'use strict';

    return {
      restrict: 'EA',
      transclude: false,
      scope: {
        data: '=',
        options: '=',
        events: '=?'
      },
      link: function (scope, element, attr) {
        const timelineEvents = [
          'rangechange',
          'rangechanged',
          'timechange',
          'timechanged',
          'select',
          'doubleClick',
          'click',
          'contextmenu'
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

          // Timeline without groups
          if (isNullOrUndefined(scope.data.groups)) {
            timeline = new vis.Timeline(element[0], scope.data.items, scope.options);
          }
          // Timeline with groups
          else {
            timeline = new vis.Timeline(element[0], scope.data.items, scope.data.groups, scope.options);
          }

          // Attach an event handler if defined
          if (!isNullOrUndefined(scope.events)) {
            angular.forEach(scope.events, function (callback, event) {
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
      }
    };
  });
