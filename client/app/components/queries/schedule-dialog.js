import moment from 'moment';
import { map, range, partial } from 'underscore';
import { durationHumanize } from '@/filters';

import template from './schedule-dialog.html';

function padWithZeros(size, v) {
  let str = String(v);
  if (str.length < size) {
    str = `0${str}`;
  }
  return str;
}

function queryTimePicker() {
  return {
    restrict: 'E',
    scope: {
      refreshType: '=',
      query: '=',
      saveQuery: '=',
    },
    template: `
      <select ng-disabled="refreshType != 'daily'" ng-model="hour" ng-change="updateSchedule()" ng-options="c as c for c in hourOptions"></select> :
      <select ng-disabled="refreshType != 'daily'" ng-model="minute" ng-change="updateSchedule()" ng-options="c as c for c in minuteOptions"></select>
    `,
    link($scope) {
      $scope.hourOptions = map(range(0, 24), partial(padWithZeros, 2));
      $scope.minuteOptions = map(range(0, 60, 5), partial(padWithZeros, 2));

      if ($scope.query.hasDailySchedule()) {
        const parts = $scope.query.scheduleInLocalTime().split(':');
        $scope.minute = parts[1];
        $scope.hour = parts[0];
      } else {
        $scope.minute = '15';
        $scope.hour = '00';
      }

      $scope.updateSchedule = () => {
        const newSchedule = moment().hour($scope.hour)
          .minute($scope.minute)
          .utc()
          .format('HH:mm');

        if (newSchedule !== $scope.query.schedule) {
          $scope.query.schedule = newSchedule;
          $scope.saveQuery();
        }
      };

      $scope.$watch('refreshType', () => {
        if ($scope.refreshType === 'daily') {
          $scope.updateSchedule();
        }
      });
    },
  };
}

function queryRefreshSelect(clientConfig) {
  return {
    restrict: 'E',
    scope: {
      refreshType: '=',
      query: '=',
      saveQuery: '=',
    },
    template: `<select
                ng-disabled="refreshType != 'periodic'"
                ng-model="query.schedule"
                ng-change="saveQuery()"
                ng-options="c.value as c.name for c in refreshOptions">
                <option value="">No Refresh</option>
                </select>`,
    link($scope) {
      $scope.refreshOptions =
        clientConfig.queryRefreshIntervals.map(interval => ({ value: String(interval), name: `Every ${durationHumanize(interval)}` }));

      $scope.$watch('refreshType', () => {
        if ($scope.refreshType === 'periodic') {
          if ($scope.query.hasDailySchedule()) {
            $scope.query.schedule = null;
            $scope.saveQuery();
          }
        }
      });
    },

  };
}

const ScheduleForm = {
  controller() {
    this.query = this.resolve.query;
    this.saveQuery = this.resolve.saveQuery;

    if (this.query.hasDailySchedule()) {
      this.refreshType = 'daily';
    } else {
      this.refreshType = 'periodic';
    }
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
};

export default function init(ngModule) {
  ngModule.directive('queryTimePicker', queryTimePicker);
  ngModule.directive('queryRefreshSelect', queryRefreshSelect);
  ngModule.component('scheduleDialog', ScheduleForm);
}
