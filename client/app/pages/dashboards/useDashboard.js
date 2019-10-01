import { useState, useEffect, useMemo, useCallback } from 'react';
import { isEmpty, includes, compact, map } from 'lodash';
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

function useDashboard(dashboard) {
  const [filters, setFilters] = useState([]);
  const [widgets, setWidgets] = useState(dashboard.widgets);
  const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);

  const loadWidget = useCallback((widget, forceRefresh = false) => {
    widget.getParametersDefs(); // Force widget to read parameters values from URL
    setWidgets([...dashboard.widgets]); // TODO: Explore a better way to do this
    return widget.load(forceRefresh).then(() => setWidgets([...dashboard.widgets]));
  }, [dashboard]);

  const refreshWidget = useCallback(widget => loadWidget(widget, true), [loadWidget]);

  const collectFilters = useCallback((forceRefresh = false, updatedParameters = []) => {
    const affectedWidgets = getAffectedWidgets(widgets, updatedParameters);
    const loadWidgetPromises = compact(affectedWidgets.map(widget => loadWidget(widget, forceRefresh)));

    return Promise.all(loadWidgetPromises).then(() => {
      const queryResults = compact(map(widgets, widget => widget.getQueryResult()));
      const updatedFilters = collectDashboardFilters(dashboard, queryResults, $location.search());
      setFilters(updatedFilters);
    });
  }, [dashboard, widgets, loadWidget]);

  const refreshDashboard = updatedParameters => collectFilters(true, updatedParameters);
  const loadDashboard = () => collectFilters();

  useEffect(() => {
    loadDashboard();
  }, [dashboard]);

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
