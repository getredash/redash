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
    // const gridster = element.find('.gridster ul').gridster({
    //   widget_margins: [5, 5],
    //   widget_base_dimensions: [260, 100],
    //   min_cols: 2,
    //   max_cols: 2,
    //   serialize_params($w, wgd) {
    //     return {
    //       col: wgd.col,
    //       row: wgd.row,
    //       id: $w.data('widget-id'),
    //     };
    //   },
    // }).data('gridster');
    //
    // const gsItemTemplate = '<li data-widget-id="{id}" class="widget panel panel-default gs-w">' +
    //   '<div class="panel-heading">{name}' +
    //   '</div></li>';

    // $scope.$watch('dashboard.layout', () => {
    //   $timeout(() => {
    //     gridster.remove_all_widgets();
    //
    //     if ($scope.dashboard.widgets && $scope.dashboard.widgets.length) {
    //       const layout = [];
    //
    //       _.each($scope.dashboard.widgets, (row, rowIndex) => {
    //         _.each(row, (widget, colIndex) => {
    //           layout.push({
    //             id: widget.id,
    //             col: colIndex + 1,
    //             row: rowIndex + 1,
    //             ySize: 1,
    //             xSize: widget.width,
    //             name: widget.getName(), // visualization.query.name
    //           });
    //         });
    //       });
    //
    //       _.each(layout, (item) => {
    //         const el = gsItemTemplate.replace('{id}', item.id).replace('{name}', item.name);
    //         gridster.add_widget(el, item.xSize, item.ySize, item.col, item.row);
    //       });
    //     }
    //   });
    // }, true);

    this.saveDashboard = () => {
      this.saveInProgress = true;
      // TODO: we should use the dashboard service here.
      if (this.dashboard.id) {
        // const positions = $(element).find('.gridster ul').data('gridster').serialize();
        // let layout = [];
        // _.each(_.sortBy(positions, pos =>
        //    pos.row * 10 + pos.col
        // ), (pos) => {
        //   const row = pos.row - 1;
        //   const col = pos.col - 1;
        //   layout[row] = layout[row] || [];
        //   if (col > 0 && layout[row][col - 1] == undefined) {
        //     layout[row][col - 1] = pos.id;
        //   } else {
        //     layout[row][col] = pos.id;
        //   }
        // });
        // $scope.dashboard.layout = layout;

        // layout = JSON.stringify(layout);
        const layout = JSON.stringify(this.dashboard.layout);

        Dashboard.save({ slug: this.dashboard.id,
          name: this.dashboard.name,
          version: this.dashboard.version,
          layout }, (dashboard) => {
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
