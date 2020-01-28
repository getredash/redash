import { useState, useEffect, useMemo, useCallback } from "react";
import { isEmpty, includes, compact, map, has, pick, keys, extend, every, get } from "lodash";
import notification from "@/services/notification";
import location from "@/services/location";
import { Dashboard, collectDashboardFilters } from "@/services/dashboard";
import { currentUser } from "@/services/auth";
import recordEvent from "@/services/recordEvent";
import AddWidgetDialog from "@/components/dashboards/AddWidgetDialog";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import PermissionsEditorDialog from "@/components/PermissionsEditorDialog";
import { editableMappingsToParameterMappings, synchronizeWidgetTitles } from "@/components/ParameterMappingInput";
import ShareDashboardDialog from "../components/ShareDashboardDialog";
import useFullscreenHandler from "./useFullscreenHandler";
import useRefreshRateHandler from "./useRefreshRateHandler";
import useEditModeHandler from "./useEditModeHandler";

export { DashboardStatusEnum } from "./useEditModeHandler";

function getAffectedWidgets(widgets, updatedParameters = []) {
  return !isEmpty(updatedParameters)
    ? widgets.filter(widget =>
        Object.values(widget.getParameterMappings())
          .filter(({ type }) => type === "dashboard-level")
          .some(({ mapTo }) =>
            includes(
              updatedParameters.map(p => p.name),
              mapTo
            )
          )
      )
    : widgets;
}

function useDashboard(dashboardData) {
  const [dashboard, setDashboard] = useState(dashboardData);
  const [filters, setFilters] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [gridDisabled, setGridDisabled] = useState(false);
  const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);
  const canEditDashboard = useMemo(
    () =>
      !dashboard.is_archived &&
      has(dashboard, "user.id") &&
      (currentUser.id === dashboard.user.id || currentUser.hasPermission("admin")),
    [dashboard]
  );
  const hasOnlySafeQueries = useMemo(
    () => every(dashboard.widgets, w => (w.getQuery() ? w.getQuery().is_safe : true)),
    [dashboard]
  );

  const managePermissions = useCallback(() => {
    const aclUrl = `api/dashboards/${dashboard.id}/acl`;
    PermissionsEditorDialog.showModal({
      aclUrl,
      context: "dashboard",
      author: dashboard.user,
    }).result.catch(() => {}); // ignore dismiss
  }, [dashboard]);

  const updateDashboard = useCallback(
    (data, includeVersion = true) => {
      setDashboard(currentDashboard => extend({}, currentDashboard, data));
      // for some reason the request uses the id as slug
      data = { ...data, slug: dashboard.id };
      if (includeVersion) {
        data = { ...data, version: dashboard.version };
      }
      return Dashboard.save(data)
        .then(updatedDashboard =>
          setDashboard(currentDashboard => extend({}, currentDashboard, pick(updatedDashboard, keys(data))))
        )
        .catch(error => {
          const status = get(error, "response.status");
          if (status === 403) {
            notification.error("Dashboard update failed", "Permission Denied.");
          } else if (status === 409) {
            notification.error(
              "It seems like the dashboard has been modified by another user. ",
              "Please copy/backup your changes and reload this page.",
              { duration: null }
            );
          }
        });
    },
    [dashboard]
  );

  const togglePublished = useCallback(() => {
    recordEvent("toggle_published", "dashboard", dashboard.id);
    updateDashboard({ is_draft: !dashboard.is_draft }, false);
  }, [dashboard, updateDashboard]);

  const loadWidget = useCallback((widget, forceRefresh = false) => {
    widget.getParametersDefs(); // Force widget to read parameters values from URL
    setDashboard(currentDashboard => extend({}, currentDashboard));
    return widget.load(forceRefresh).finally(() => setDashboard(currentDashboard => extend({}, currentDashboard)));
  }, []);

  const refreshWidget = useCallback(widget => loadWidget(widget, true), [loadWidget]);

  const removeWidget = useCallback(
    widgetId => {
      dashboard.widgets = dashboard.widgets.filter(widget => widget.id !== undefined && widget.id !== widgetId);
      setDashboard(currentDashboard => extend({}, currentDashboard));
    },
    [dashboard]
  );

  const loadDashboard = useCallback(
    (forceRefresh = false, updatedParameters = []) => {
      const affectedWidgets = getAffectedWidgets(dashboard.widgets, updatedParameters);
      const loadWidgetPromises = compact(
        affectedWidgets.map(widget => loadWidget(widget, forceRefresh).catch(error => error))
      );

      return Promise.all(loadWidgetPromises).then(() => {
        const queryResults = compact(map(dashboard.widgets, widget => widget.getQueryResult()));
        const updatedFilters = collectDashboardFilters(dashboard, queryResults, location.search);
        setFilters(updatedFilters);
      });
    },
    [dashboard, loadWidget]
  );

  const refreshDashboard = useCallback(
    updatedParameters => {
      if (!refreshing) {
        setRefreshing(true);
        loadDashboard(true, updatedParameters).finally(() => setRefreshing(false));
      }
    },
    [refreshing, loadDashboard]
  );

  const archiveDashboard = useCallback(() => {
    recordEvent("archive", "dashboard", dashboard.id);
    Dashboard.delete(dashboard).then(updatedDashboard =>
      setDashboard(currentDashboard => extend({}, currentDashboard, pick(updatedDashboard, ["is_archived"])))
    );
  }, [dashboard]); // eslint-disable-line react-hooks/exhaustive-deps

  const showShareDashboardDialog = useCallback(() => {
    ShareDashboardDialog.showModal({
      dashboard,
      hasOnlySafeQueries,
    })
      .result.catch(() => {}) // ignore dismiss
      .finally(() => setDashboard(currentDashboard => extend({}, currentDashboard)));
  }, [dashboard, hasOnlySafeQueries]);

  const showAddTextboxDialog = useCallback(() => {
    TextboxDialog.showModal({
      dashboard,
      onConfirm: text =>
        dashboard.addWidget(text).then(() => setDashboard(currentDashboard => extend({}, currentDashboard))),
    }).result.catch(() => {}); // ignore dismiss
  }, [dashboard]);

  const showAddWidgetDialog = useCallback(() => {
    AddWidgetDialog.showModal({
      dashboard,
      onConfirm: (visualization, parameterMappings) =>
        dashboard
          .addWidget(visualization, {
            parameterMappings: editableMappingsToParameterMappings(parameterMappings),
          })
          .then(widget => {
            const widgetsToSave = [
              widget,
              ...synchronizeWidgetTitles(widget.options.parameterMappings, dashboard.widgets),
            ];
            return Promise.all(widgetsToSave.map(w => w.save())).then(() =>
              setDashboard(currentDashboard => extend({}, currentDashboard))
            );
          }),
    }).result.catch(() => {}); // ignore dismiss
  }, [dashboard]);

  const [refreshRate, setRefreshRate, disableRefreshRate] = useRefreshRateHandler(refreshDashboard);
  const [fullscreen, toggleFullscreen] = useFullscreenHandler();
  const editModeHandler = useEditModeHandler(!gridDisabled && canEditDashboard, dashboard.widgets);

  useEffect(() => {
    setDashboard(dashboardData);
    loadDashboard();
  }, [dashboardData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = dashboard.name;
  }, [dashboard.name]);

  // reload dashboard when filter option changes
  useEffect(() => {
    loadDashboard();
  }, [dashboard.dashboard_filters_enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dashboard,
    globalParameters,
    refreshing,
    filters,
    setFilters,
    loadDashboard,
    refreshDashboard,
    updateDashboard,
    togglePublished,
    archiveDashboard,
    loadWidget,
    refreshWidget,
    removeWidget,
    canEditDashboard,
    refreshRate,
    setRefreshRate,
    disableRefreshRate,
    ...editModeHandler,
    gridDisabled,
    setGridDisabled,
    fullscreen,
    toggleFullscreen,
    showShareDashboardDialog,
    showAddTextboxDialog,
    showAddWidgetDialog,
    managePermissions,
  };
}

export default useDashboard;
