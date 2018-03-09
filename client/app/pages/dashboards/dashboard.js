import * as _ from 'underscore';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import { durationHumanize } from '@/filters';
import template from './dashboard.html';
import shareDashboardTemplate from './share-dashboard.html';
import './dashboard.less';

function isWidgetPositionChanged(oldPosition, newPosition) {
  const fields = ['col', 'row', 'sizeX', 'sizeY', 'autoHeight'];
  oldPosition = _.pick(oldPosition, fields);
  newPosition = _.pick(newPosition, fields);
  return !!_.find(fields, key => newPosition[key] !== oldPosition[key]);
}

function collectWidgetPositions(widgets) {
  return _.chain(widgets)
    .map(widget => [widget.id, _.clone(widget.options.position)])
    .object()
    .value();
}

function getWidgetsWithChangedPositions(widgets, savedPositions) {
  return _.filter(widgets, (widget) => {
    const savedPosition = savedPositions[widget.id];
    if (!_.isObject(savedPosition)) {
      return true;
    }
    return isWidgetPositionChanged(savedPosition, widget.options.position);
  });
}

function DashboardCtrl(
  $rootScope,
  $routeParams,
  $location,
  $timeout,
  $q,
  $uibModal,
  Title,
  AlertDialog,
  Dashboard,
  currentUser,
  clientConfig,
  Events,
  dashboardGridOptions,
  toastr,
) {
  this.saveInProgress = false;

  // This variable should always be in sync with widgets
  let savedWidgetPositions = {};

  const saveDashboardLayout = (widgets) => {
    if (!this.dashboard.canEdit()) {
      return;
    }

    this.saveInProgress = true;
    const showMessages = true; // this.layoutEditing;
    // Temporarily disable grid editing (but allow user to use UI controls)
    this.dashboardGridOptions.draggable.enabled = false;
    this.dashboardGridOptions.resizable.enabled = false;
    return $q
      .all(_.map(widgets, widget => widget.$save()))
      .then(() => {
        if (showMessages) {
          toastr.success('Changes saved.');
        }
      })
      .catch(() => {
        if (showMessages) {
          toastr.error('Error saving changes.');
        }
      })
      .finally(() => {
        this.saveInProgress = false;
        // If user didn't disable editing mode while saving - restore grid
        this.dashboardGridOptions.draggable.enabled = this.layoutEditing;
        this.dashboardGridOptions.resizable.enabled = this.layoutEditing;
      });
  };

  this.layoutEditing = false;
  this.dashboardGridOptions = _.extend({}, dashboardGridOptions, {
    resizable: {
      enabled: false,
      handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
    },
    draggable: {
      enabled: false,
    },
  });

  this.isFullscreen = false;
  this.refreshRate = null;
  this.isGridDisabled = false;
  this.showPermissionsControl = clientConfig.showPermissionsControl;
  this.globalParameters = [];
  this.refreshRates = [
    { name: '10 seconds', rate: 10 },
    { name: '30 seconds', rate: 30 },
    { name: '1 minute', rate: 60 },
    { name: '5 minutes', rate: 60 * 5 },
    { name: '10 minutes', rate: 60 * 10 },
    { name: '30 minutes', rate: 60 * 30 },
    { name: '1 hour', rate: 60 * 60 },
    { name: '12 hour', rate: 12 * 60 * 60 },
    { name: '24 hour', rate: 24 * 60 * 60 },
  ];

  this.refreshRates =
    clientConfig.dashboardRefreshIntervals.map(interval => ({ name: durationHumanize(interval), rate: interval }));

  $rootScope.$on('gridster-mobile-changed', ($event, gridster) => {
    this.isGridDisabled = gridster.isMobile;
  });

  this.setRefreshRate = (rate) => {
    this.refreshRate = rate;
    if (rate !== null) {
      this.loadDashboard(true);
      this.autoRefresh();
    }
  };

  this.extractGlobalParameters = () => {
    let globalParams = {};
    this.dashboard.widgets.forEach((widget) => {
      if (widget.getQuery()) {
        widget
          .getQuery()
          .getParametersDefs()
          .filter(p => p.global)
          .forEach((param) => {
            const defaults = {};
            defaults[param.name] = _.create(Object.getPrototypeOf(param), param);
            defaults[param.name].locals = [];
            globalParams = _.defaults(globalParams, defaults);
            globalParams[param.name].locals.push(param);
          });
      }
    });
    this.globalParameters = _.values(globalParams);
  };

  this.onGlobalParametersChange = () => {
    this.globalParameters.forEach((global) => {
      global.locals.forEach((local) => {
        local.value = global.value;
      });
    });
  };

  const collectFilters = (dashboard, forceRefresh) => {
    const queryResultPromises = _.compact(this.dashboard.widgets.map(widget => widget.getQueryResult(forceRefresh)))
      .map(queryResult => queryResult.toPromise());

    $q.all(queryResultPromises).then((queryResults) => {
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

          if (hasQueryStringValue) {
            queryFilter.current = $location.search()[queryFilter.name];
          }

          if (!_.has(filters, queryFilter.name)) {
            const filter = _.extend({}, queryFilter);
            filters[filter.name] = filter;
            filters[filter.name].originFilters = [];
          }

          // TODO: merge values.
          filters[queryFilter.name].originFilters.push(queryFilter);
        });
      });

      this.filters = _.values(filters);
      this.filtersOnChange = (filter) => {
        _.each(filter.originFilters, (originFilter) => {
          originFilter.current = filter.current;
        });
      };
    });
  };

  const renderDashboard = (dashboard, force) => {
    Title.set(dashboard.name);
    this.extractGlobalParameters();
    collectFilters(dashboard, force);
  };

  this.loadDashboard = _.throttle((force) => {
    this.dashboard = Dashboard.get(
      { slug: $routeParams.dashboardSlug },
      (dashboard) => {
        Events.record('view', 'dashboard', dashboard.id);
        renderDashboard(dashboard, force);

        if ($location.search().edit === true) {
          $location.search('edit', null);
          this.editLayout(true);
        }

        savedWidgetPositions = collectWidgetPositions(dashboard.widgets);
      },
      (rejection) => {
        const statusGroup = Math.floor(rejection.status / 100);
        if (statusGroup === 5) {
          // recoverable errors - all 5** (server is temporarily unavailable
          // for some reason, but it should get up soon).
          this.loadDashboard();
        } else {
          // all kind of 4** errors are not recoverable, so just display them
          throw new PromiseRejectionError(rejection);
        }
      },
    );
  }, 1000);

  this.loadDashboard();

  this.autoRefresh = () => {
    $timeout(() => {
      this.loadDashboard(true);
    }, this.refreshRate.rate * 1000).then(() => this.autoRefresh());
  };

  this.archiveDashboard = () => {
    const archive = () => {
      Events.record('archive', 'dashboard', this.dashboard.id);
      this.dashboard.$delete(() => {
        $rootScope.$broadcast('reloadDashboards');
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

  this.editLayout = (enableEditing, applyChanges) => {
    if (!this.isGridDisabled) {
      if (enableEditing) {
        if (!this.layoutEditing) {
          // Save current positions of widgets
          savedWidgetPositions = collectWidgetPositions(this.dashboard.widgets);
        }
      } else {
        if (applyChanges) {
          const changedWidgets = getWidgetsWithChangedPositions(
            this.dashboard.widgets,
            savedWidgetPositions,
          );
          saveDashboardLayout(changedWidgets).finally(() => {
            savedWidgetPositions = collectWidgetPositions(this.dashboard.widgets);
          });
        } else {
          // Revert changes
          _.each(this.dashboard.widgets, (widget) => {
            if (_.isObject(savedWidgetPositions[widget.id])) {
              widget.options.position = savedWidgetPositions[widget.id];
            }
          });
        }
        savedWidgetPositions = collectWidgetPositions(this.dashboard.widgets);
      }

      this.layoutEditing = enableEditing;
      this.dashboardGridOptions.draggable.enabled = this.layoutEditing && !this.saveInProgress;
      this.dashboardGridOptions.resizable.enabled = this.layoutEditing && !this.saveInProgress;
    }
  };

  this.saveName = () => {
    Dashboard.save(
      { slug: this.dashboard.id, version: this.dashboard.version, name: this.dashboard.name },
      (dashboard) => {
        this.dashboard = dashboard;
        $rootScope.$broadcast('reloadDashboards');
      },
      (error) => {
        if (error.status === 403) {
          toastr.error('Name update failed: Permission denied.');
        } else if (error.status === 409) {
          toastr.error(
            'It seems like the dashboard has been modified by another user. ' +
              'Please copy/backup your changes and reload this page.',
            { autoDismiss: false },
          );
        }
      },
    );
  };

  this.updateDashboardFiltersState = () => {
    // / do something for humanity.
    collectFilters(this.dashboard, false);
  };

  this.addWidget = () => {
    $uibModal
      .open({
        component: 'addWidgetDialog',
        resolve: {
          dashboard: () => this.dashboard,
        },
      })
      .result.then(() => {
        this.extractGlobalParameters();
        // Save position of newly added widget (but not entire layout)
        const widget = _.last(this.dashboard.widgets);
        if (_.isObject(widget)) {
          return widget.$save().then(() => {
            if (this.layoutEditing) {
              savedWidgetPositions[widget.id] = _.clone(widget.options.position);
            }
          });
        }
      });
  };

  this.removeWidget = () => {
    this.extractGlobalParameters();
    if (!this.layoutEditing) {
      // We need to wait a bit for `angular-gridster` before it updates widgets,
      // and only then save new layout
      $timeout(() => {
        const changedWidgets = getWidgetsWithChangedPositions(
          this.dashboard.widgets,
          savedWidgetPositions,
        );
        saveDashboardLayout(changedWidgets).finally(() => {
          savedWidgetPositions = collectWidgetPositions(this.dashboard.widgets);
        });
      }, 50);
    }
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

  this.togglePublished = () => {
    Events.record('toggle_published', 'dashboard', this.dashboard.id);
    this.dashboard.is_draft = !this.dashboard.is_draft;
    this.saveInProgress = true;
    Dashboard.save(
      {
        slug: this.dashboard.id,
        name: this.dashboard.name,
        is_draft: this.dashboard.is_draft,
      },
      (dashboard) => {
        this.saveInProgress = false;
        this.dashboard.version = dashboard.version;
        $rootScope.$broadcast('reloadDashboards');
      },
    );
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
    'ngInject';

    this.dashboard = this.resolve.dashboard;

    this.toggleSharing = () => {
      const url = `api/dashboards/${this.dashboard.id}/share`;

      if (!this.dashboard.publicAccessEnabled) {
        // disable
        $http
          .delete(url)
          .success(() => {
            this.dashboard.publicAccessEnabled = false;
            delete this.dashboard.public_url;
          })
          .error(() => {
            this.dashboard.publicAccessEnabled = true;
            // TODO: show message
          });
      } else {
        $http
          .post(url)
          .success((data) => {
            this.dashboard.publicAccessEnabled = true;
            this.dashboard.public_url = data.public_url;
          })
          .error(() => {
            this.dashboard.publicAccessEnabled = false;
            // TODO: show message
          });
      }
    };
  },
};

export default function init(ngModule) {
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
