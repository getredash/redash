const template = `
  <span class="label label-tag" ng-repeat="tag in $ctrl.item.tags">{{ tag }}</span
  ><a ng-if="$ctrl.canEdit && $ctrl.item.tags.length == 0" class="label label-tag"
    ><i class="zmdi zmdi-plus"></i> Add tag</a
  ><a ng-if="$ctrl.canEdit && $ctrl.item.tags.length > 0" class="label label-tag"
    ><i class="zmdi zmdi-edit"></i></a>
`;

export default function init(ngModule) {
  ngModule.component('tagsControl', {
    template,
    bindings: {
      item: '=',
      canEdit: '<',
    },
    controller() {
    },
  });
}

