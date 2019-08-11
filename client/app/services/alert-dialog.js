export let AlertDialog = null; // eslint-disable-line import/no-mutable-exports

const AlertDialogComponent = {
  template: `
<div class="modal-header">
    <h4 class="modal-title" ng-if="$ctrl.title">{{$ctrl.title}}</h4>
</div>
<div class="modal-body">
  <p ng-bind-html="$ctrl.message"></p>
</div>
<div class="modal-footer">
  <button class="btn btn-default" ng-click="$ctrl.dismiss()">Cancel</button>
  <button class="btn" ng-class="$ctrl.confirm.class" ng-click="$ctrl.close()" ng-if="$ctrl.confirm.show">{{$ctrl.confirm.title}}</button>
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
    this.confirm = Object.assign({}, { class: 'btn-sucess', show: true, title: 'OK' }, this.resolve.confirm);
  },
};

function AlertDialogService($uibModal) {
  return {
    open(title, message, confirm) {
      return $uibModal.open({
        component: 'alertDialog',
        resolve: {
          title: () => title,
          message: () => message,
          confirm: () => confirm,
        },
      }).result;
    },
  };
}

export default function init(ngModule) {
  ngModule.component('alertDialog', AlertDialogComponent);
  ngModule.factory('AlertDialog', AlertDialogService);

  ngModule.run(($injector) => {
    AlertDialog = $injector.get('AlertDialog');
  });
}

init.init = true;
