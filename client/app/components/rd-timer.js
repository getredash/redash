import moment from 'moment';

function rdTimer() {
  return {
    restrict: 'E',
    scope: { timestamp: '=' },
    template: '{{currentTime}}',
    controller($scope) {
      $scope.currentTime = '00:00:00';

      // We're using setInterval directly instead of $timeout, to avoid using $apply, to
      // prevent the digest loop being run every second.
      let currentTimer = setInterval(() => {
        $scope.currentTime = moment(moment() - moment($scope.timestamp)).utc().format('HH:mm:ss');
        $scope.$digest();
      }, 1000);

      $scope.$on('$destroy', () => {
        if (currentTimer) {
          clearInterval(currentTimer);
          currentTimer = null;
        }
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('rdTimer', rdTimer);
}

init.init = true;

