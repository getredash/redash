import { useState, useEffect, useMemo, useCallback } from 'react';
import { isEmpty, isNaN, includes, compact, map, has, pick, keys, extend, every } from 'lodash';
import notification from '@/services/notification';
import { $location, $rootScope } from '@/services/ng';
import { Dashboard, collectDashboardFilters } from '@/services/dashboard';
import { currentUser } from '@/services/auth';
import recordEvent from '@/services/recordEvent';
import AddWidgetDialog from '@/components/dashboards/AddWidgetDialog';
import TextboxDialog from '@/components/dashboards/TextboxDialog';
import {
  editableMappingsToParameterMappings,
  synchronizeWidgetTitles,
} from '@/components/ParameterMappingInput';
import ShareDashboardDialog from './ShareDashboardDialog';

function updateUrlSearch(...params) {
  $location.search(...params);
  $rootScope.$applyAsync();
}

function getAffectedWidgets(widgets, updatedParameters = []) {
  return !isEmpty(updatedParameters) ? widgets.filter(
    widget => Object.values(widget.getParameterMappings()).filter(
      ({ type }) => type === 'dashboard-level',
    ).some(
      ({ mapTo }) => includes(updatedParameters.map(p => p.name), mapTo),
    ),
  ) : widgets;
}

function getRefreshRateFromUrl() {
  const refreshRate = parseFloat($location.search().refresh);
  return isNaN(refreshRate) ? null : Math.max(30, refreshRate);
}

function useFullscreenHandler() {
  const [fullscreen, setFullscreen] = useState(has($location.search(), 'fullscreen'));
  useEffect(() => {
    document.querySelector('body').classList.toggle('headless', fullscreen);
    updateUrlSearch('fullscreen', fullscreen ? true : null);
  }, [fullscreen]);

  const toggleFullscreen = () => setFullscreen(!fullscreen);
  return [fullscreen, toggleFullscreen];
}

function useRefreshRateHandler(refreshDashboard) {
  const [refreshRate, setRefreshRate] = useState(getRefreshRateFromUrl());

  useEffect(() => {
    updateUrlSearch('refresh', refreshRate || null);
    if (refreshRate) {
      const refreshTimer = setInterval(refreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshRate]);

  return [refreshRate, setRefreshRate];
}

function useEditModeHandler(canEditDashboard) {
  const [editingLayout, setEditingLayout] = useState(canEditDashboard && has($location.search(), 'edit'));

  useEffect(() => {
    updateUrlSearch('edit', editingLayout ? true : null);
  }, [editingLayout]);

  return [editingLayout, editing => setEditingLayout(canEditDashboard && editing)];
}

function useDashboard(dashboardData) {
  const [dashboard, setDashboard] = useState(dashboardData);
  const [filters, setFilters] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [widgets, setWidgets] = useState(dashboard.widgets);
  const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);
  const canEditDashboard = useMemo(
    () => !dashboard.is_archived && has(dashboard, 'user.id') && (
      currentUser.id === dashboard.user.id || currentUser.hasPermission('admin')
    ),
    [dashboard],
  );
  const hasOnlySafeQueries = useMemo(
    () => every(widgets, w => (w.getQuery() ? w.getQuery().is_safe : true)),
    [widgets],
  );

  const managePermissions = useCallback(() => {
    // TODO: open PermissionsEditorDialog
  }, []);

  const updateDashboard = useCallback((data, includeVersion = true) => {
    setDashboard(extend({}, dashboard, data));
    // for some reason the request uses the id as slug
    data = { ...data, slug: dashboard.id };
    if (includeVersion) {
      data = { ...data, version: dashboard.version };
    }
    return Dashboard.save(
      data,
      updatedDashboard => setDashboard(extend({}, dashboard, pick(updatedDashboard, keys(data)))),
      (error) => {
        if (error.status === 403) {
          notification.error('Dashboard update failed', 'Permission Denied.');
        } else if (error.status === 409) {
          notification.error(
            'It seems like the dashboard has been modified by another user. ',
            'Please copy/backup your changes and reload this page.',
            { duration: null },
          );
        }
      },
    ).$promise;
  }, [dashboard]);

  const togglePublished = useCallback(
    () => {
      recordEvent('toggle_published', 'dashboard', dashboard.id);
      updateDashboard({ is_draft: !dashboard.is_draft }, false);
    },
    [dashboard, updateDashboard],
  );

  const loadWidget = useCallback((widget, forceRefresh = false) => {
    widget.getParametersDefs(); // Force widget to read parameters values from URL
    setWidgets([...dashboard.widgets]);
    return widget.load(forceRefresh).finally(() => setWidgets([...dashboard.widgets]));
  }, [dashboard]);

  const refreshWidget = useCallback(widget => loadWidget(widget, true), [loadWidget]);

  const loadDashboard = useCallback((forceRefresh = false, updatedParameters = []) => {
    const affectedWidgets = getAffectedWidgets(widgets, updatedParameters);
    const loadWidgetPromises = compact(
      affectedWidgets.map(widget => loadWidget(widget, forceRefresh).catch(error => error)),
    );

    return Promise.all(loadWidgetPromises).then(() => {
      const queryResults = compact(map(widgets, widget => widget.getQueryResult()));
      const updatedFilters = collectDashboardFilters(dashboard, queryResults, $location.search());
      setFilters(updatedFilters);
    });
  }, [dashboard, widgets, loadWidget]);

  const refreshDashboard = useCallback(
    (updatedParameters) => {
      setRefreshing(true);
      loadDashboard(true, updatedParameters).finally(() => setRefreshing(false));
    },
    [loadDashboard],
  );

  const archiveDashboard = useCallback(() => {
    recordEvent('archive', 'dashboard', dashboard.id);
    dashboard.$delete().then(() => loadDashboard());
  }, [dashboard, updateDashboard]);

  const showShareDashboardDialog = useCallback(() => {
    ShareDashboardDialog.showModal({
      dashboard,
      hasOnlySafeQueries,
    }).result.finally(() => setDashboard(extend({}, dashboard)));
  }, [dashboard, hasOnlySafeQueries]);

  const showAddTextboxDialog = useCallback(() => {
    TextboxDialog.showModal({
      dashboard,
      onConfirm: text => dashboard.addWidget(text).then(() => setWidgets(dashboard.widgets)),
    });
  }, [dashboard]);

  const showAddWidgetDialog = useCallback(() => {
    AddWidgetDialog.showModal({
      dashboard,
      onConfirm: (visualization, parameterMappings) => dashboard.addWidget(visualization, {
        parameterMappings: editableMappingsToParameterMappings(parameterMappings),
      }).then((widget) => {
        const widgetsToSave = [
          widget,
          ...synchronizeWidgetTitles(widget.options.parameterMappings, dashboard.widgets),
        ];
        return Promise.all(widgetsToSave.map(w => w.save())).then(() => setWidgets(dashboard.widgets));
      }),
    });
  }, [dashboard]);

  const [refreshRate, setRefreshRate] = useRefreshRateHandler(refreshDashboard);
  const [fullscreen, toggleFullscreen] = useFullscreenHandler();
  const [editingLayout, setEditingLayout] = useEditModeHandler(canEditDashboard);

  useEffect(() => {
    setDashboard(dashboardData);
    loadDashboard();
  }, [dashboardData]);

  return {
    dashboard,
    widgets,
    globalParameters,
    refreshing,
    filters,
    setFilters,
    refreshDashboard,
    updateDashboard,
    togglePublished,
    archiveDashboard,
    loadWidget,
    refreshWidget,
    canEditDashboard,
    refreshRate,
    setRefreshRate,
    editingLayout,
    setEditingLayout,
    fullscreen,
    toggleFullscreen,
    showShareDashboardDialog,
    showAddTextboxDialog,
    showAddWidgetDialog,
    managePermissions,
  };
}

export default useDashboard;
