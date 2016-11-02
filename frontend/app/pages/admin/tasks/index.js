import moment from 'moment';
import template from './tasks.html';
import registerCancelQueryButton from './cancel-query-button';

function TasksCtrl($scope, $location, $http, $timeout, NgTableParams, currentUser, Events) {
  Events.record(currentUser, 'view', 'page', 'admin/tasks');
  // $scope.$parent.pageTitle = 'Running Queries';
  $scope.autoUpdate = true;

  $scope.selectedTab = 'in_progress';

  $scope.tasks = {
    pending: [],
    in_progress: [],
    done: [],
  };

  this.tableParams = new NgTableParams({ count: 50 }, {});

  $scope.setTab = (tab) => {
    $scope.selectedTab = tab;
    this.tableParams.settings({
      dataset: $scope.tasks[tab],
    });
  };

  $scope.setTab($location.hash() || 'in_progress');

  const refresh = () => {
    if ($scope.autoUpdate) {
      $scope.refresh_time = moment().add(1, 'minutes');
      $http.get('/api/admin/queries/tasks').success((data) => {
        $scope.tasks = data;
        this.tableParams.settings({
          dataset: $scope.tasks[$scope.selectedTab],
        });
      });
    }

    const timer = $timeout(refresh, 5 * 1000);

    $scope.$on('$destroy', () => {
      if (timer) {
        $timeout.cancel(timer);
      }
    });
  };

  refresh();
}

export default function (ngModule) {
  ngModule.component('tasksPage', {
    template,
    controller: TasksCtrl,
  });

  registerCancelQueryButton(ngModule);

  return {
    '/admin/queries/tasks': {
      template: '<tasks-page></tasks-page>',
    },
  };
}
