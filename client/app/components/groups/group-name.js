function controller($window, $location, toastr, currentUser) {
  this.canEdit = () => currentUser.isAdmin && this.group.type !== 'builtin';

  this.saveName = () => {
    this.group.$save();
  };

  this.deleteGroup = () => {
    if ($window.confirm('Are you sure you want to delete this group?')) {
      this.group.$delete(() => {
        $location.path('/groups').replace();
        toastr.success('Group deleted successfully.');
      });
    }
  };
}

export default function init(ngModule) {
  ngModule.component('groupName', {
    bindings: {
      group: '<',
    },
    transclude: true,
    template: `
      <h2 class="p-l-5">
        <edit-in-place editable="$ctrl.canEdit()" done="$ctrl.saveName" ignore-blanks='true' value="$ctrl.group.name"></edit-in-place>&nbsp;
        <button class="btn btn-xs btn-danger" ng-if="$ctrl.canEdit()" ng-click="$ctrl.deleteGroup()">Delete this group</button>
      </h2>
    `,
    replace: true,
    controller,
  });
}
