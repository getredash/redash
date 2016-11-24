const ErrorMessagesComponent = {
  template: `
  <div class="help-block" ng-messages="$ctrl.input.$error" ng-show="$ctrl.input.$touched || $ctrl.form.$submitted">
    <span class="error" ng-message="required">This field is required.</span>
    <span class="error" ng-message="minlength">This field is too short.</span>
    <span class="error" ng-message="email">This needs to be a valid email.</span>
  </div>
  `,
  replace: true,
  bindings: {
    input: '<',
    form: '<',
  },
  controller() {
  },
};

export default function (ngModule) {
  ngModule.component('errorMessages', ErrorMessagesComponent);
}
