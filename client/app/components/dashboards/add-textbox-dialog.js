import template from './add-textbox-dialog.html';

const AddTextboxDialog = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller(toastr, Widget) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;
    this.saveInProgress = false;

    this.text = '';

    this.saveWidget = () => {
      this.saveInProgress = true;

      const widget = new Widget({
        visualization_id: null,
        dashboard_id: this.dashboard.id,
        options: {
          isHidden: false,
          position: {},
        },
        visualization: null,
        text: this.text,
      });

      const position = this.dashboard.calculateNewWidgetPosition(widget);
      widget.options.position.col = position.col;
      widget.options.position.row = position.row;

      widget
        .save()
        .then(() => {
          this.dashboard.widgets.push(widget);
          this.close();
        })
        .catch(() => {
          toastr.error('Widget can not be added');
        })
        .finally(() => {
          this.saveInProgress = false;
        });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('addTextboxDialog', AddTextboxDialog);
}
