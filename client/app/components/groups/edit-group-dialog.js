import template from './edit-group-dialog.html';

const EditGroupDialogComponent = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($location) {
    'ngInject';

    this.group = this.resolve.group;
    const newGroup = this.group.id === undefined;

    if (newGroup) {
      this.saveButtonText = 'Create';
      this.title = 'Create a New Group';
    } else {
      this.saveButtonText = 'Save';
      this.title = 'Edit Group';
    }

    this.ok = () => {
      this.group.$save((group) => {
        if (newGroup) {
          $location.path(`/groups/${group.id}`).replace();
          this.close();
        } else {
          this.close();
        }
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editGroupDialog', EditGroupDialogComponent);
}
