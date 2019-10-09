import { useState, useEffect, useMemo, useCallback } from 'react';
import { isEmpty, isNaN, includes, compact, map, has, pick, keys, extend, omit } from 'lodash';
import notification from '@/services/notification';
import { $location } from '@/services/ng';
import { Dashboard, collectDashboardFilters } from '@/services/dashboard';
import { currentUser } from '@/services/auth';

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

function updateRefreshRateOnUrl(refreshRate) {
  const params = extend({}, $location.search(), { refresh: refreshRate });
  if (refreshRate) {
    $location.search(params);
  } else {
    $location.search(omit(params, ['refresh']));
  }
}

function useFullscreenHandler() {
  const [fullscreen, setFullscreen] = useState(has($location.search(), 'fullscreen'));
  useEffect(() => {
    const params = extend({}, $location.search(), { fullscreen: '1' });
    document.querySelector('body').classList.toggle('headless', fullscreen);
    if (fullscreen) {
      $location.search(params);
    } else {
      $location.search(omit(params, ['fullscreen']));
    }
  }, [fullscreen]);

  const toggleFullscreen = () => setFullscreen(!fullscreen);
  return [fullscreen, toggleFullscreen];
}

function useDashboard(dashboardData) {
  const [dashboard, setDashboard] = useState(dashboardData);
  const [filters, setFilters] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [widgets, setWidgets] = useState(dashboard.widgets);
  const [editingLayout, setEditingLayout] = useState(false);
  const [fullscreen, toggleFullscreen] = useFullscreenHandler();
  const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);
  const [refreshRate, setRefreshRate] = useState(getRefreshRateFromUrl());
  const canEditDashboard = useMemo(
    () => has(dashboard, 'user.id') && (currentUser.id === dashboard.user.id || currentUser.hasPermission('admin')),
    [dashboard],
  );

  const updateDashboard = useCallback((data) => {
    setDashboard(extend({}, dashboard, data));
    // for some reason the request uses the id as slug
    data = { ...data, slug: dashboard.id, version: dashboard.version };
    Dashboard.save(
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
    );
  }, [dashboard]);

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

  useEffect(() => {
    setDashboard(dashboardData);
  }, [dashboardData]);

  useEffect(() => {
    loadDashboard();
  }, [dashboard]);

  useEffect(() => {
    updateRefreshRateOnUrl(refreshRate);
    if (refreshRate) {
      const refreshTimer = setInterval(refreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshRate]);

  return {
    dashboard,
    widgets,
    globalParameters,
    refreshing,
    filters,
    setFilters,
    refreshDashboard,
    updateDashboard,
    loadWidget,
    refreshWidget,
    canEditDashboard,
    refreshRate,
    setRefreshRate,
    editingLayout,
    setEditingLayout,
    fullscreen,
    toggleFullscreen,
  };
}

export default useDashboard;
