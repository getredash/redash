import { wrap } from 'underscore';

const AlertDialogComponent = {
  template: `
<div class="modal-header">
    <h4 class="modal-title">{{$ctrl.title}}</h4>
</div>
<div class="modal-body">
  <p ng-bind-html="$ctrl.message"></p>
</div>
<div class="modal-footer">
  <button class="btn btn-default" ng-click="$ctrl.close()">Cancel</button>
  <button class="btn" ng-class="action.class" ng-click="action.callback()" ng-repeat="action in $ctrl.actions">{{action.title}}</button>
</div>
  `,
  bindings: {
    close: '&',
    dismiss: '&',
    resolve: '<',
  },
  controller() {
    this.title = this.resolve.title;
    this.message = this.resolve.message;
    this.actions = this.resolve.actions.map((action) => {
      action.callback = wrap(action.callback, (callback) => {
        callback();
        this.close();
      });
      return action;
    });
  },
};

function AlertDialog($uibModal) {
  const service = {
    open(title, message, actions) {
      $uibModal.open({
        // windowClass: 'modal-sm',
        component: 'alertDialog',
        resolve: {
          title: () => title,
          message: () => message,
          actions: () => actions,
        },
      });
    },
  };

  return service;
}

export default function (ngModule) {
  ngModule.component('alertDialog', AlertDialogComponent);
  ngModule.factory('AlertDialog', AlertDialog);
}
