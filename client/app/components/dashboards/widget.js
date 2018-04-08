import template from './widget.html';
import editTextBoxTemplate from './edit-text-box.html';
import './widget.less';

const EditTextBoxComponent = {
  template: editTextBoxTemplate,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller(toastr) {
    'ngInject';

    this.saveInProgress = false;
    this.widget = this.resolve.widget;
    this.saveWidget = () => {
      this.saveInProgress = true;
      if (this.widget.new_text !== this.widget.existing_text) {
        this.widget.text = this.widget.new_text;
        this.widget
          .$save()
          .then(() => {
            this.close();
          })
          .catch(() => {
            toastr.error('Widget can not be updated');
          })
          .finally(() => {
            this.saveInProgress = false;
          });
      } else {
        this.close();
      }
    };
  },
};

function DashboardWidgetCtrl($location, $uibModal, $window, Events, currentUser) {
  this.canViewQuery = currentUser.hasPermission('view_query');

  this.editTextBox = () => {
    this.widget.existing_text = this.widget.text;
    this.widget.new_text = this.widget.text;
    $uibModal.open({
      component: 'editTextBox',
      resolve: {
        widget: this.widget,
      },
    });
  };

  this.localParametersDefs = () => {
    if (!this.localParameters) {
      this.localParameters = this.widget
        .getQuery()
        .getParametersDefs()
        .filter(p => !p.global);
    }
    return this.localParameters;
  };

  this.deleteWidget = () => {
    if (!$window.confirm(`Are you sure you want to remove "${this.widget.getName()}" from the dashboard?`)) {
      return;
    }

    Events.record('delete', 'widget', this.widget.id);

    this.widget.$delete((response) => {
      this.dashboard.widgets = this.dashboard.widgets.filter(w => w.id !== undefined && w.id !== this.widget.id);
      this.dashboard.version = response.version;
      if (this.deleted) {
        this.deleted({});
      }
    });
  };

  Events.record('view', 'widget', this.widget.id);

  this.reload = (force) => {
    const maxAge = $location.search().maxAge;
    this.widget.load(force, maxAge);
  };

  if (this.widget.visualization) {
    Events.record('view', 'query', this.widget.visualization.query.id, { dashboard: true });
    Events.record('view', 'visualization', this.widget.visualization.id, { dashboard: true });

    this.reload(false);

    this.type = 'visualization';
  } else if (this.widget.restricted) {
    this.type = 'restricted';
  } else {
    this.type = 'textbox';
  }
}

export default function init(ngModule) {
  ngModule.component('editTextBox', EditTextBoxComponent);
  ngModule.component('dashboardWidget', {
    template,
    controller: DashboardWidgetCtrl,
    bindings: {
      widget: '<',
      public: '<',
      dashboard: '<',
      deleted: '&onDelete',
    },
  });
}
