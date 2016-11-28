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
      schedule: '=',
      callback: '<',
      modal: '=',
    },
    template: ` <select
                  ng-model="schedule"
                  ng-options="c.value as c.name for c in refreshOptions">
                  <option value="" disabled selected>No refresh</option>
                </select>
                <div class="modal-footer">
                    <button class="btn btn-default" ng-click="modal.close()">Cancel</button>
                    <button class='btn btn-primary' 
                        ng-click='save(); modal.close()'>
                        Save
                    </button>
                </div>`,
    link($scope) {
      $scope.schedule = $scope.schedule ? $scope.schedule : '';

      $scope.refreshOptions = [
        {
          value: '* * * * *',
          name: 'Every minute',
        },
      ];

      [5, 10, 15, 30].forEach((i) => {
        $scope.refreshOptions.push({
          value: `*/${i} * * * *`,
          name: `Every ${i} minutes`,
        });
      });

      range(1, 13).forEach((i) => {
        $scope.refreshOptions.push({
          value: `0 */${i} * * *`,
          name: `Every ${i}h`,
        });
      });

      $scope.refreshOptions.push({
        value: '0 0 * * *',
        name: 'Every day',
      });

      $scope.save = () => {
        $scope.callback($scope.schedule);
      };

      $scope.$watch('refreshType', () => {
        if ($scope.refreshType === 'advanced') {
          if ($scope.query.hasDailySchedule()) {
            $scope.schedule = '';
            $scope.callback('');
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
      schedule: '=',
      callback: '<',
      modal: '=',
    },
    template: periodicRefreshTemplate,
    link($scope) {
      $scope.schedule = $scope.schedule ? $scope.schedule : '';
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
        if ($scope.schedule === '' || $scope.schedule.split(' ').length !== 5) {
          return false;
        }
        const [minute, hours, dom, , dow] = $scope.schedule.split(' ');
        if (hours.length && hours !== '*') {
          $scope.params.schedules = [];
          hours.split(',').forEach((hour) => {
            const newTime = {};
            newTime.hour = padWithZeros(2, hour);
            newTime.minute = padWithZeros(2, minute);
            $scope.params.schedules.push(newTime);
          });
          $scope.params.scheduleType = 'weekly';
        }
        if (dom.length && dom !== '*') {
          $scope.params.daysOfTheMonth = dom;
          $scope.params.scheduleType = 'monthly';
        }
        if (dow.length && dow !== '*') {
          $scope.params.daysOfTheWeek = dow.split(',').map(e => parseInt(e, 10));
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
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];

      $scope.loadCronParameters();

      $scope.range = range;
      $scope.hourOptions = map(range(0, 24), partial(padWithZeros, 2));
      $scope.minuteOptions = map(range(0, 60, 5), partial(padWithZeros, 2));

      $scope.updateCron = () => {
        // Syntax: minute hour dom month dow
        if ($scope.params.scheduleType === 'cron') {
          return $scope.params.cronSchedule;
        }
        const hourString = unique(sortBy($scope.params.schedules.map(e => upadTrailingZero(e.hour)))).join(',');
        const minuteString = upadTrailingZero($scope.params.schedules[0].minute);
        let [dowString, domString] = ['', ''];
        if ($scope.params.daysOfTheWeek.length) {
          dowString = $scope.params.daysOfTheWeek.join(',');
        } else {
          dowString = '*';
        }
        if ($scope.params.daysOfTheMonth.length) {
          if ($scope.params.daysOfTheMonth !== '*') {
            let errorFound = false;
            $scope.params.daysOfTheMonth.split(',').forEach((e) => {
              if (!/\d{1,2}/.test(e) || (/\d{1,2}/.test(e) && parseInt(e, 10) > 31)) {
                errorFound = true;
              }
            });
            $scope.errors.daysOfTheMonth = errorFound;
          }
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
        $scope.schedule = $scope.updateCron();
        $scope.callback($scope.schedule);
      };
    },

  };
}

const ScheduleForm = {
  controller() {
    if (!this.schedule) {
      this.schedule = '';
    }

    this.schedule = this.resolve.schedule;
    this.callback = this.resolve.callback;

    if (this.schedule === '' || typeof this.schedule !== 'string') {
      this.refreshType = '';
    } else if (this.schedule.indexOf('* * *') > -1) {
      this.refreshType = 'basic';
    } else {
      this.refreshType = 'advanced';
    }

    this.resetRefresh = () => {
      this.schedule = '';
      this.callback(this.schedule);
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
