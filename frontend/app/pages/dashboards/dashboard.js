import * as _ from 'underscore';
import template from './dashboard.html';
import shareDashboardTemplate from './share-dashboard.html';

function DashboardCtrl($routeParams, $location, $timeout, $q, $uibModal,
  AlertDialog, Dashboard, currentUser, clientConfig, Events) {
  this.refreshEnabled = false;
  this.isFullscreen = false;
  this.refreshRate = null;
  this.showPermissionsControl = clientConfig.showPermissionsControl;
  this.currentUser = currentUser;
  this.refreshRates = [
    { name: '10 seconds', rate: 10 },
    { name: '30 seconds', rate: 30 },
    { name: '1 minute', rate: 60 },
    { name: '5 minutes', rate: 60 * 5 },
    { name: '10 minutes', rate: 60 * 10 },
    { name: '30 minutes', rate: 60 * 30 },
    { name: '1 hour', rate: 60 * 60 },
  ];

  this.setRefreshRate = (rate) => {
    this.refreshRate = rate;
    this.loadDashboard(true);
    this.autoRefresh();
  };

  const renderDashboard = (dashboard, force) => {
    // $scope.$parent.pageTitle = dashboard.name;
    const promises = [];

    this.dashboard.widgets.forEach(row =>
       row.forEach((widget) => {
         if (widget.visualization) {
           const maxAge = force ? 0 : undefined;
           const queryResult = widget.getQuery().getQueryResult(maxAge);
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

  this.loadDashboard = _.throttle((force) => {
    this.dashboard = Dashboard.get({ slug: $routeParams.dashboardSlug }, (dashboard) => {
      Events.record(currentUser, 'view', 'dashboard', dashboard.id);
      renderDashboard(dashboard, force);
    }, () => {
        // error...
        // try again. we wrap loadDashboard with throttle so it doesn't happen too often.
        // we might want to consider exponential backoff and also move this as a general
        // solution in $http/$resource for all AJAX calls.
      this.loadDashboard();
    });
  }, 1000);

  this.loadDashboard();

  this.autoRefresh = () => {
    $timeout(() => {
      this.loadDashboard(true);
    }, this.refreshRate.rate * 1000
    ).then(() => this.autoRefresh());
  };

  this.archiveDashboard = () => {
    const archive = () => {
      Events.record(currentUser, 'archive', 'dashboard', this.dashboard.id);
      this.dashboard.$delete(() => {
        // TODO:
        // this.$parent.reloadDashboards();
      });
    };

    const title = 'Archive Dashboard';
    const message = `Are you sure you want to archive the "${this.dashboard.name}" dashboard?`;
    const confirm = { class: 'btn-warning', title: 'Archive' };

    AlertDialog.open(title, message, confirm).then(archive);
  };

  this.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/dashboards/${this.dashboard.id}/acl` },
      },
    });
  };

  this.editDashboard = () => {
    $uibModal.open({
      component: 'editDashboardDialog',
      resolve: {
        dashboard: () => this.dashboard,
      },
    }).result.then((dashboard) => { this.dashboard = dashboard; });
  };

  this.addWidget = () => {
    $uibModal.open({
      component: 'addWidgetDialog',
      resolve: {
        dashboard: () => this.dashboard,
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
