function autofocus($timeout) {
  return {
    link(scope, element) {
      $timeout(() => {
        element[0].focus();
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('autofocus', autofocus);
}

init.init = true;
