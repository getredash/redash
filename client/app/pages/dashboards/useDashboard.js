import { useState, useEffect, useMemo } from 'react';
import { isEmpty, includes, compact } from 'lodash';
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

  const loadWidget = (widget, forceRefresh = false) => {
    widget.getParametersDefs(); // Force widget to read parameters values from URL
    setWidgets(dashboard.widgets);
    return widget.load(forceRefresh).then((result) => {
      setWidgets(dashboard.widgets);
      return result;
    });
  };

  const refreshWidget = widget => loadWidget(widget, true);

  const collectFilters = (forceRefresh = false, updatedParameters = []) => {
    const affectedWidgets = getAffectedWidgets(widgets, updatedParameters);
    const queryResultPromises = compact(affectedWidgets.map(widget => loadWidget(widget, forceRefresh)));

    return Promise.all(queryResultPromises).then((queryResults) => {
      const updatedFilters = collectDashboardFilters(dashboard, queryResults, $location.search());
      setFilters(updatedFilters);
    });
  };

  const refreshDashboard = updatedParameters => collectFilters(true, updatedParameters);
  const loadDashboard = () => collectFilters();

  useEffect(() => {
    loadDashboard();
  }, []);

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
