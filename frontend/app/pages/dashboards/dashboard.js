import * as _ from 'underscore';
import template from './dashboard.html';
import shareDashboardTemplate from './share-dashboard.html';

function findMinRefreshRate(dashboard) {
  const refreshRate = _.min(_.compact(_.map(_.flatten(dashboard.widgets), (widget) => {
    if (widget.visualization) {
      const schedule = widget.visualization.query.schedule;
      if (schedule === null || schedule.match(/\d\d:\d\d/) !== null) {
        return 60;
      }
      return widget.visualization.query.schedule;
    }
    return null;
  })));

  return _.min([300, refreshRate]) * 1000;
}

function DashboardCtrl($window, $routeParams, $location, $timeout, $q, $uibModal,
  Dashboard, currentUser, clientConfig, Events, Widget) {
  this.refreshEnabled = false;
  this.isFullscreen = false;
  this.refreshRate = 60;
  this.showPermissionsControl = clientConfig.showPermissionsControl;
  this.currentUser = currentUser;

  const renderDashboard = (dashboard) => {
    // $scope.$parent.pageTitle = dashboard.name;
    const promises = [];

    this.dashboard.widgets.forEach(row =>
       row.forEach((widget) => {
         if (widget.visualization) {
           const queryResult = widget.getQuery().getQueryResult();
           if (!_.isUndefined(queryResult)) {
             promises.push(queryResult.toPromise());
           }
         }
       })
    );

    $q.all(promises).then((queryResults) => {
      const filters = {};
      queryResults.forEach((queryResult) => {
        const queryFilters = queryResult.getFilters();
        queryFilters.forEach((queryFilter) => {
          const hasQueryStringValue = _.has($location.search(), queryFilter.name);

          if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
            // If dashboard filters not enabled, or no query string value given,
            // skip filters linking.
            return;
          }

          if (!_.has(filters, queryFilter.name)) {
            const filter = _.extend({}, queryFilter);
            filters[filter.name] = filter;
            filters[filter.name].originFilters = [];
            if (hasQueryStringValue) {
              filter.current = $location.search()[filter.name];
            }

            // $scope.$watch(() => filter.current, (value) => {
            //   _.each(filter.originFilters, (originFilter) => {
            //     originFilter.current = value;
            //   });
            // });
          }

          // TODO: merge values.
          filters[queryFilter.name].originFilters.push(queryFilter);
        });
      });

      this.filters = _.values(filters);
    });
  };

  const loadDashboard = _.throttle(() => {
    this.dashboard = Dashboard.get({ slug: $routeParams.dashboardSlug }, (dashboard) => {
      Events.record(currentUser, 'view', 'dashboard', dashboard.id);
      renderDashboard(dashboard);
    }, () => {
        // error...
        // try again. we wrap loadDashboard with throttle so it doesn't happen too often.
        // we might want to consider exponential backoff and also move this as a general
        // solution in $http/$resource for all AJAX calls.
      loadDashboard();
    }
    );
  }, 1000);

  loadDashboard();

  const autoRefresh = () => {
    if (this.refreshEnabled) {
      $timeout(() => {
        Dashboard.get({ slug: $routeParams.dashboardSlug }, (dashboard) => {
          const newWidgets = _.groupBy(_.flatten(dashboard.widgets), 'id');

          _.each(this.dashboard.widgets, (row) => {
            _.each(row, (widget, i) => {
              const newWidget = newWidgets[widget.id][0];
              if (newWidget.visualization) {
                const previousResultId = widget.visualization.query.latest_query_data_id;
                const newResultId = newWidget.visualization.query.latest_query_data_id;
                if (newWidget && newResultId !== previousResultId) {
                  row[i] = new Widget(newWidget);
                }
              }
            });
          });

          autoRefresh();
        });
      }, this.refreshRate);
    }
  };

  this.archiveDashboard = () => {
    if ($window.confirm(`Are you sure you want to archive the "${this.dashboard.name}" dashboard?`)) {
      Events.record(currentUser, 'archive', 'dashboard', this.dashboard.id);
      this.dashboard.$delete(() => {
        // TODO:
        // this.$parent.reloadDashboards();
      });
    }
  };

  this.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/dashboards/${this.dashboard.id}/acl` },
      },
    });
  };

  this.toggleFullscreen = () => {
    this.isFullscreen = !this.isFullscreen;
    document.querySelector('body').classList.toggle('headless');

    if (this.isFullscreen) {
      $location.search('fullscreen', true);
    } else {
      $location.search('fullscreen', null);
    }
  };

  if (_.has($location.search(), 'fullscreen')) {
    this.toggleFullscreen();
  }

  this.triggerRefresh = () => {
    this.refreshEnabled = !this.refreshEnabled;

    Events.record(currentUser, 'autorefresh', 'dashboard', this.dashboard.id, { enable: this.refreshEnabled });

    if (this.refreshEnabled) {
      this.refreshRate = findMinRefreshRate(this.dashboard);
      autoRefresh();
    }
  };

  this.openShareForm = () => {
    $uibModal.open({
      component: 'shareDashboard',
      resolve: {
        dashboard: this.dashboard,
      },
    });
  };
}

const ShareDashboardComponent = {
  template: shareDashboardTemplate,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($http) {
    this.dashboard = this.resolve.dashboard;

    this.toggleSharing = () => {
      const url = `api/dashboards/${this.dashboard.id}/share`;

      if (!this.dashboard.publicAccessEnabled) {
        // disable
        $http.delete(url).success(() => {
          this.dashboard.publicAccessEnabled = false;
          delete this.dashboard.public_url;
        }).error(() => {
          this.dashboard.publicAccessEnabled = true;
          // TODO: show message
        });
      } else {
        $http.post(url).success((data) => {
          this.dashboard.publicAccessEnabled = true;
          this.dashboard.public_url = data.public_url;
        }).error(() => {
          this.dashboard.publicAccessEnabled = false;
          // TODO: show message
        });
      }
    };
  },
};

export default function (ngModule) {
  ngModule.component('shareDashboard', ShareDashboardComponent);
  ngModule.component('dashboardPage', {
    template,
    controller: DashboardCtrl,
  });

  return {
    '/dashboard/:dashboardSlug': {
      template: '<dashboard-page></dashboard-page>',
      reloadOnSearch: false,
    },
  };
}
