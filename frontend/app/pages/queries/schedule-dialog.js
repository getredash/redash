import moment from 'moment';
import { filter, map, range, partial, sortBy, unique } from 'underscore';
import template from './schedule-dialog.html';
import periodicRefreshTemplate from './periodic-refresh-template.html';

function padWithZeros(size, v) {
  let str = String(v);
  if (str.length < size) {
    str = `0${str}`;
  }
  return str;
}

const upadTrailingZero = (v) => {
  if (v[0] === '0') {
    return v[1];
  }
  return v;
};

function basicRefresh() {
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
      $scope.refreshOptions = [
        {
          value: '60',
          name: 'Every minute',
        },
      ];

      [5, 10, 15, 30].forEach((i) => {
        $scope.refreshOptions.push({
          value: String(i * 60),
          name: `Every ${i} minutes`,
        });
      });

      range(1, 13).forEach((i) => {
        $scope.refreshOptions.push({
          value: String(i * 3600),
          name: `Every ${i}h`,
        });
      });

      $scope.refreshOptions.push({
        value: String(24 * 3600),
        name: 'Every 24h',
      });
      $scope.refreshOptions.push({
        value: String(7 * 24 * 3600),
        name: 'Every 7 days',
      });
      $scope.refreshOptions.push({
        value: String(14 * 24 * 3600),
        name: 'Every 14 days',
      });
      $scope.refreshOptions.push({
        value: String(30 * 24 * 3600),
        name: 'Every 30 days',
      });

      $scope.$watch('refreshType', () => {
        if ($scope.refreshType === 'advanced') {
          if ($scope.query.hasDailySchedule()) {
            $scope.query.schedule = null;
            $scope.saveQuery();
          }
        }
      });
    },

  };
}


function advancedRefresh() {
  return {
    restrict: 'E',
    scope: {
      refreshType: '=',
      query: '=',
      saveQuery: '=',
    },
    template: periodicRefreshTemplate,
    link($scope) {
      $scope.pushOrRemoveDay = (x) => {
        if ($scope.params.daysOfTheWeek.indexOf(x) > -1) {
          $scope.params.daysOfTheWeek = filter(
            $scope.params.daysOfTheWeek, element => element !== x && typeof element !== 'string'
          );
        } else {
          $scope.params.daysOfTheWeek.push(x);
        }
      };

      $scope.loadCronParameters = () => {
        if ($scope.query.schedule === null || $scope.query.schedule.split(' ').length !== 5) {
          return false;
        }
        const [minute, hours, dom, , dow] = $scope.query.schedule.split(' ');
        if (hours.length && hours !== '*') {
          hours.split(',').forEach((hour) => {
            const newTime = {};
            newTime.hour = padWithZeros(2, hour);
            newTime.minute = padWithZeros(2, minute);
            $scope.params.schedules.push(newTime);
          });
          console.log(hours, $scope.params.schedules);

          $scope.params.scheduleType = 'weekly';
        }
        if (dom.length && dom !== '*') {
          $scope.params.daysOfTheMonth = dom;
          $scope.params.scheduleType = 'monthly';
        }
        if (dow.length && dow !== '*') {
          $scope.params.daysOfTheWeek = dow.split(',').map(e => parseInt(e, 10) + 1);
        }
        return true;
      };

      $scope.errors = {};

      $scope.params = {
        daysOfTheWeek: [],
        daysOfTheMonth: '',
        schedules: [
          { hour: '00', minute: '15' },
        ],
      };

      $scope.daysOfTheWeek = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];

      $scope.loadCronParameters();

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

      $scope.updateCron = () => {
        // Syntax: minute hour dom month dow user cmd
        if ($scope.params.scheduleType === 'cron') {
          return $scope.params.cronSchedule;
        }
        const hourString = unique(sortBy($scope.params.schedules.map(e => upadTrailingZero(e.hour)))).join(',');
        const minuteString = upadTrailingZero($scope.params.schedules[0].minute);
        let [dowString, domString] = ['', ''];
        if ($scope.params.scheduleType === 'weekly') {
          console.log($scope.params.daysOfTheWeek);
          dowString = $scope.params.daysOfTheWeek.map(e => e + 1).join(',');
        } else {
          dowString = '*';
        }
        if ($scope.params.scheduleType === 'monthly' && $scope.params.daysOfTheMonth.length) {
          let errorFound = false;
          $scope.params.daysOfTheMonth.split(',').forEach((e) => {
            if (!/\d{1,2}/.test(e) || (/\d{1,2}/.test(e) && parseInt(e, 10) > 31)) {
              errorFound = true;
            }
          });
          $scope.errors.daysOfTheMonth = errorFound;
          domString = $scope.params.daysOfTheMonth;
        } else {
          domString = '*';
        }
        const cron = `${minuteString} ${hourString} ${domString} * ${dowString}`;
        $scope.params.cronSchedule = cron;
        return cron;
      };

      $scope.$watch('params', $scope.updateCron, true);

      $scope.save = () => {
        $scope.query.schedule = $scope.updateCron();
        console.log($scope.query.schedule);
        $scope.saveQuery();
      };
    },

  };
}

const ScheduleForm = {
  controller() {
    this.query = this.resolve.query;
    this.saveQuery = this.resolve.saveQuery;

    if (this.query.hasDailySchedule()) {
      this.refreshType = 'basic';
    } else {
      this.refreshType = 'advanced';
    }

    this.resetRefresh = () => {
      this.query.schedule = null;
      this.saveQuery();
    };
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
};

export default function (ngModule) {
  ngModule.directive('basicRefresh', basicRefresh);
  ngModule.directive('advancedRefresh', advancedRefresh);
  ngModule.component('scheduleDialog', ScheduleForm);
}
