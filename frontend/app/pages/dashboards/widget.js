import template from './widget.html';
import editTextBoxTemplate from './edit-text-box.html';

const EditTextBoxComponent = {
  template: editTextBoxTemplate,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller(toastr) {
    this.saveInProgress = false;
    this.widget = this.resolve.widget;
    this.saveWidget = () => {
      this.saveInProgress = true;
      this.widget.$save().then(() => {
        this.close();
      }).catch(() => {
        toastr.error('Widget can not be updated');
      }).finally(() => {
        this.saveInProgress = false;
      });
    };
  },
};

function DashboardWidgetCtrl($location, $uibModal, $window, Events, currentUser) {
  this.canViewQuery = currentUser.hasPermission('view_query');

  this.editTextBox = () => {
    $uibModal.open({
      component: 'editTextBox',
      resolve: {
        widget: this.widget,
      },
    });
  };

  this.deleteWidget = () => {
    if (!$window.confirm(`Are you sure you want to remove "${this.widget.getName()}" from the dashboard?`)) {
      return;
    }

    Events.record('delete', 'widget', this.widget.id);

    this.widget.$delete((response) => {
      this.dashboard.widgets =
        this.dashboard.widgets.map(row => row.filter(widget => widget.id !== undefined));

      this.dashboard.widgets = this.dashboard.widgets.filter(row => row.length > 0);

      this.dashboard.layout = response.layout;
      this.dashboard.version = response.version;
    });
  };

  Events.record('view', 'widget', this.widget.id);

  this.reload = (force) => {
    let maxAge = $location.search().maxAge;
    if (force) {
      maxAge = 0;
    }
    this.queryResult = this.query.getQueryResult(maxAge);
  };

  if (this.widget.visualization) {
    Events.record('view', 'query', this.widget.visualization.query.id);
    Events.record('view', 'visualization', this.widget.visualization.id);

    this.query = this.widget.getQuery();
    this.reload(false);

    this.type = 'visualization';
  } else if (this.widget.restricted) {
    this.type = 'restricted';
  } else {
    this.type = 'textbox';
  }
}

export default function (ngModule) {
  ngModule.component('editTextBox', EditTextBoxComponent);
  ngModule.component('dashboardWidget', {
    template,
    controller: DashboardWidgetCtrl,
    bindings: {
      widget: '<',
      dashboard: '<',
    },
  });
}
