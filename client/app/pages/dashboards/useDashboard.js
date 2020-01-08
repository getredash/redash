import { useState, useEffect, useMemo, useCallback } from "react";
import {
  isEmpty,
  isNaN,
  includes,
  compact,
  map,
  has,
  pick,
  keys,
  extend,
  every,
  find,
  debounce,
  isMatch,
  pickBy,
  max,
  min,
} from "lodash";
import notification from "@/services/notification";
import { $location, $rootScope } from "@/services/ng";
import { Dashboard, collectDashboardFilters } from "@/services/dashboard";
import { currentUser } from "@/services/auth";
import recordEvent from "@/services/recordEvent";
import { policy } from "@/services/policy";
import AddWidgetDialog from "@/components/dashboards/AddWidgetDialog";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import PermissionsEditorDialog from "@/components/PermissionsEditorDialog";
import { editableMappingsToParameterMappings, synchronizeWidgetTitles } from "@/components/ParameterMappingInput";
import ShareDashboardDialog from "./ShareDashboardDialog";

export const DashboardStatusEnum = {
  SAVED: "saved",
  SAVING: "saving",
  SAVING_FAILED: "saving_failed",
};

function updateUrlSearch(...params) {
  $location.search(...params);
  $rootScope.$applyAsync();
}

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

function getChangedPositions(widgets, nextPositions = {}) {
  return pickBy(nextPositions, (nextPos, widgetId) => {
    const widget = find(widgets, { id: Number(widgetId) });
    const prevPos = widget.options.position;
    return !isMatch(prevPos, nextPos);
  });
}

function getLimitedRefreshRate(refreshRate) {
  const allowedIntervals = policy.getDashboardRefreshIntervals();
  return max([30, min(allowedIntervals), refreshRate]);
}

function getRefreshRateFromUrl() {
  const refreshRate = parseFloat($location.search().refresh);
  return isNaN(refreshRate) ? null : getLimitedRefreshRate(refreshRate);
}

function useFullscreenHandler() {
  const [fullscreen, setFullscreen] = useState(has($location.search(), "fullscreen"));
  useEffect(() => {
    document.querySelector("body").classList.toggle("headless", fullscreen);
    updateUrlSearch("fullscreen", fullscreen ? true : null);
  }, [fullscreen]);

  const toggleFullscreen = () => setFullscreen(!fullscreen);
  return [fullscreen, toggleFullscreen];
}

function useRefreshRateHandler(refreshDashboard) {
  const [refreshRate, setRefreshRate] = useState(getRefreshRateFromUrl());

  useEffect(() => {
    updateUrlSearch("refresh", refreshRate || null);
    if (refreshRate) {
      const refreshTimer = setInterval(refreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshDashboard, refreshRate]);

  return [refreshRate, rate => setRefreshRate(getLimitedRefreshRate(rate)), () => setRefreshRate(null)];
}

function useEditModeHandler(canEditDashboard, widgets) {
  const [editingLayout, setEditingLayout] = useState(canEditDashboard && has($location.search(), "edit"));
  const [dashboardStatus, setDashboardStatus] = useState(DashboardStatusEnum.SAVED);
  const [recentPositions, setRecentPositions] = useState([]);
  const [doneBtnClickedWhileSaving, setDoneBtnClickedWhileSaving] = useState(false);

  useEffect(() => {
    updateUrlSearch("edit", editingLayout ? true : null);
  }, [editingLayout]);

  useEffect(() => {
    if (doneBtnClickedWhileSaving && dashboardStatus === DashboardStatusEnum.SAVED) {
      setDoneBtnClickedWhileSaving(false);
      setEditingLayout(false);
    }
  }, [doneBtnClickedWhileSaving, dashboardStatus]);

  const saveDashboardLayout = useCallback(
    positions => {
      if (!canEditDashboard) {
        setDashboardStatus(DashboardStatusEnum.SAVED);
        return;
      }

      const changedPositions = getChangedPositions(widgets, positions);

      setDashboardStatus(DashboardStatusEnum.SAVING);
      setRecentPositions(positions);
      const saveChangedWidgets = map(changedPositions, (position, id) => {
        // find widget
        const widget = find(widgets, { id: Number(id) });

        // skip already deleted widget
        if (!widget) {
          return Promise.resolve();
        }

        return widget.save("options", { position });
      });

      return Promise.all(saveChangedWidgets)
        .then(() => setDashboardStatus(DashboardStatusEnum.SAVED))
        .catch(() => {
          setDashboardStatus(DashboardStatusEnum.SAVING_FAILED);
          notification.error("Error saving changes.");
        });
    },
    [canEditDashboard, widgets]
  );

  const saveDashboardLayoutDebounced = useCallback(
    (...args) => {
      setDashboardStatus(DashboardStatusEnum.SAVING);
      return debounce(() => saveDashboardLayout(...args), 2000)();
    },
    [saveDashboardLayout]
  );

  const retrySaveDashboardLayout = useCallback(() => saveDashboardLayout(recentPositions), [
    recentPositions,
    saveDashboardLayout,
  ]);

  const setEditing = useCallback(
    editing => {
      if (!editing && dashboardStatus !== DashboardStatusEnum.SAVED) {
        setDoneBtnClickedWhileSaving(true);
        return;
      }
      setEditingLayout(canEditDashboard && editing);
    },
    [dashboardStatus, canEditDashboard]
  );

  return {
    editingLayout: canEditDashboard && editingLayout,
    setEditingLayout: setEditing,
    saveDashboardLayout: editingLayout ? saveDashboardLayoutDebounced : saveDashboardLayout,
    retrySaveDashboardLayout,
    doneBtnClickedWhileSaving,
    dashboardStatus,
  };
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
    });
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
        .$promise.then(updatedDashboard =>
          setDashboard(currentDashboard => extend({}, currentDashboard, pick(updatedDashboard, keys(data))))
        )
        .catch(error => {
          if (error.status === 403) {
            notification.error("Dashboard update failed", "Permission Denied.");
          } else if (error.status === 409) {
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
        const updatedFilters = collectDashboardFilters(dashboard, queryResults, $location.search());
        setFilters(updatedFilters);
      });
    },
    [dashboard, loadWidget]
  );

  const refreshDashboard = useCallback(
    updatedParameters => {
      setRefreshing(true);
      loadDashboard(true, updatedParameters).finally(() => setRefreshing(false));
    },
    [loadDashboard]
  );

  const archiveDashboard = useCallback(() => {
    recordEvent("archive", "dashboard", dashboard.id);
    dashboard.$delete().then(() => loadDashboard());
  }, [dashboard]); // eslint-disable-line react-hooks/exhaustive-deps

  const showShareDashboardDialog = useCallback(() => {
    ShareDashboardDialog.showModal({
      dashboard,
      hasOnlySafeQueries,
    }).result.finally(() => setDashboard(currentDashboard => extend({}, currentDashboard)));
  }, [dashboard, hasOnlySafeQueries]);

  const showAddTextboxDialog = useCallback(() => {
    TextboxDialog.showModal({
      dashboard,
      onConfirm: text =>
        dashboard.addWidget(text).then(() => setDashboard(currentDashboard => extend({}, currentDashboard))),
    });
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
    });
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
