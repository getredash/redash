import { sortBy } from 'underscore';
import template from './edit-dashboard-dialog.html';

const EditDashboardDialog = {
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
  controller($location, $http, toastr, Events, currentUser, Dashboard) {
    this.dashboard = this.resolve.dashboard;
    this.gridsterOptions = {
      margins: [5, 5],
      rowHeight: 100,
      colWidth: 260,
      columns: 2,
      mobileModeEnabled: false,
      swapping: true,
      minRows: 1,
      draggable: {
        enabled: true,
      },
      resizable: {
        enabled: false,
      },
    };

    this.items = [];

    if (this.dashboard.widgets) {
      this.dashboard.widgets.forEach((row, rowIndex) => {
        row.forEach((widget, colIndex) => {
          this.items.push({
            id: widget.id,
            col: colIndex,
            row: rowIndex,
            sizeY: 1,
            sizeX: widget.width,
            name: widget.getName(), // visualization.query.name
          });
        });
      });
    }

    this.saveDashboard = () => {
      this.saveInProgress = true;

      if (this.dashboard.id) {
        const layout = [];
        const sortedItems = sortBy(this.items, item => item.row * 10 + item.col);

        sortedItems.forEach((item) => {
          layout[item.row] = layout[item.row] || [];
          if (item.col > 0 && layout[item.row][item.col - 1] === undefined) {
            layout[item.row][item.col - 1] = item.id;
          } else {
            layout[item.row][item.col] = item.id;
          }
        });

        const request = {
          slug: this.dashboard.id,
          name: this.dashboard.name,
          version: this.dashboard.version,
          layout: JSON.stringify(layout),
        };

        Dashboard.save(request, (dashboard) => {
          this.dashboard = dashboard;
          this.saveInProgress = false;
          this.close({ $value: this.dashboard });
        }, (error) => {
          this.saveInProgress = false;
          if (error.status === 403) {
            toastr.error('Unable to save dashboard: Permission denied.');
          } else if (error.status === 409) {
            toastr.error('It seems like the dashboard has been modified by another user. ' +
                'Please copy/backup your changes and reload this page.', { autoDismiss: false });
          }
        });
        Events.record(currentUser, 'edit', 'dashboard', this.dashboard.id);
      } else {
        $http.post('api/dashboards', {
          name: this.dashboard.name,
        }).success((response) => {
          this.close();
          $location.path(`/dashboard/${response.slug}`).replace();
        });
        Events.record(currentUser, 'create', 'dashboard');
      }
    };
  },
};

export default function (ngModule) {
  ngModule.component('editDashboardDialog', EditDashboardDialog);
}
