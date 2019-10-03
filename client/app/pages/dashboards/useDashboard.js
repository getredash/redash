import { useState, useEffect, useMemo, useCallback } from 'react';
import { isEmpty, isNaN, includes, compact, map } from 'lodash';
import { $location } from '@/services/ng';
import { collectDashboardFilters } from '@/services/dashboard';

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

function useDashboard(dashboard) {
  const [filters, setFilters] = useState([]);
  const [widgets, setWidgets] = useState(dashboard.widgets);
  const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);
  const refreshRate = useMemo(getRefreshRateFromUrl, []);

  const loadWidget = useCallback((widget, forceRefresh = false) => {
    widget.getParametersDefs(); // Force widget to read parameters values from URL
    setWidgets([...dashboard.widgets]);
    return widget.load(forceRefresh).finally(() => setWidgets([...dashboard.widgets]));
  }, [dashboard]);

  const refreshWidget = useCallback(widget => loadWidget(widget, true), [loadWidget]);

  const loadDashboard = useCallback((forceRefresh = false, updatedParameters = []) => {
    const affectedWidgets = getAffectedWidgets(widgets, updatedParameters);
    const loadWidgetPromises = compact(affectedWidgets.map(widget => loadWidget(widget, forceRefresh)));

    return Promise.all(loadWidgetPromises).finally(() => {
      const queryResults = compact(map(widgets, widget => widget.getQueryResult()));
      const updatedFilters = collectDashboardFilters(dashboard, queryResults, $location.search());
      setFilters(updatedFilters);
    });
  }, [dashboard, widgets, loadWidget]);

  const refreshDashboard = updatedParameters => loadDashboard(true, updatedParameters);

  useEffect(() => {
    loadDashboard();
  }, [dashboard]);

  useEffect(() => {
    if (refreshRate) {
      const refreshTimer = setInterval(refreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshRate]);

  return {
    widgets,
    globalParameters,
    filters,
    setFilters,
    refreshDashboard,
    loadWidget,
    refreshWidget,
  };
}

export default useDashboard;
