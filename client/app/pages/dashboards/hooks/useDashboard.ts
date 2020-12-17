import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { isEmpty, includes, compact, map, has, pick, keys, extend, every, get } from "lodash";
import notification from "@/services/notification";
import location from "@/services/location";
import url from "@/services/url";
import { Dashboard, collectDashboardFilters } from "@/services/dashboard";
import { currentUser } from "@/services/auth";
import recordEvent from "@/services/recordEvent";
import { QueryResultError } from "@/services/query";
import AddWidgetDialog from "@/components/dashboards/AddWidgetDialog";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import PermissionsEditorDialog from "@/components/PermissionsEditorDialog";
import { editableMappingsToParameterMappings, synchronizeWidgetTitles } from "@/components/ParameterMappingInput";
import ShareDashboardDialog from "../components/ShareDashboardDialog";
import useFullscreenHandler from "../../../lib/hooks/useFullscreenHandler";
import useRefreshRateHandler from "./useRefreshRateHandler";
import useEditModeHandler from "./useEditModeHandler";
import { policy } from "@/services/policy";
export { DashboardStatusEnum } from "./useEditModeHandler";
function getAffectedWidgets(widgets: any, updatedParameters = []) {
    return !isEmpty(updatedParameters)
        ? widgets.filter((widget: any) => Object.values(widget.getParameterMappings())
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            .filter(({ type }) => type === "dashboard-level")
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '({ mapTo }: { mapTo: any; }) => ... Remove this comment to see the full error message
            .some(({ mapTo }) => includes(updatedParameters.map(p => (p as any).name), mapTo)))
        : widgets;
}
function useDashboard(dashboardData: any) {
    const [dashboard, setDashboard] = useState(dashboardData);
    const [filters, setFilters] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [gridDisabled, setGridDisabled] = useState(false);
    const globalParameters = useMemo(() => dashboard.getParametersDefs(), [dashboard]);
    const canEditDashboard = !dashboard.is_archived && policy.canEdit(dashboard);
    const isDashboardOwnerOrAdmin = useMemo(() => !dashboard.is_archived &&
        has(dashboard, "user.id") &&
        ((currentUser as any).id === dashboard.user.id || currentUser.isAdmin), [dashboard]);
    const hasOnlySafeQueries = useMemo(() => every(dashboard.widgets, w => (w.getQuery() ? w.getQuery().is_safe : true)), [dashboard]);
    const managePermissions = useCallback(() => {
        const aclUrl = `api/dashboards/${dashboard.id}/acl`;
        PermissionsEditorDialog.showModal({
            aclUrl,
            context: "dashboard",
            author: dashboard.user,
        });
    }, [dashboard]);
    const updateDashboard = useCallback((data, includeVersion = true) => {
        setDashboard((currentDashboard: any) => extend({}, currentDashboard, data));
        data = { ...data, id: dashboard.id };
        if (includeVersion) {
            data = { ...data, version: dashboard.version };
        }
        return (Dashboard as any).save(data)
            .then((updatedDashboard: any) => {
            setDashboard((currentDashboard: any) => extend({}, currentDashboard, pick(updatedDashboard, keys(data))));
            if (has(data, "name")) {
                location.setPath(url.parse(updatedDashboard.url).pathname, true);
            }
        })
            .catch((error: any) => {
            const status = get(error, "response.status");
            if (status === 403) {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
                notification.error("Dashboard update failed", "Permission Denied.");
            }
            else if (status === 409) {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
                notification.error("It seems like the dashboard has been modified by another user. ", "Please copy/backup your changes and reload this page.", { duration: null });
            }
        });
    }, [dashboard]);
    const togglePublished = useCallback(() => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("toggle_published", "dashboard", dashboard.id);
        updateDashboard({ is_draft: !dashboard.is_draft }, false);
    }, [dashboard, updateDashboard]);
    const loadWidget = useCallback((widget, forceRefresh = false) => {
        widget.getParametersDefs(); // Force widget to read parameters values from URL
        setDashboard((currentDashboard: any) => extend({}, currentDashboard));
        return widget
            .load(forceRefresh)
            .catch((error: any) => {
            // QueryResultErrors are expected
            if (error instanceof QueryResultError) {
                return;
            }
            return Promise.reject(error);
        })
            .finally(() => setDashboard((currentDashboard: any) => extend({}, currentDashboard)));
    }, []);
    const refreshWidget = useCallback(widget => loadWidget(widget, true), [loadWidget]);
    const removeWidget = useCallback(widgetId => {
        setDashboard((currentDashboard: any) => extend({}, currentDashboard, {
            widgets: currentDashboard.widgets.filter((widget: any) => widget.id !== undefined && widget.id !== widgetId),
        }));
    }, []);
    const dashboardRef = useRef();
    dashboardRef.current = dashboard;
    const loadDashboard = useCallback((forceRefresh = false, updatedParameters = []) => {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        const affectedWidgets = getAffectedWidgets(dashboardRef.current.widgets, updatedParameters);
        const loadWidgetPromises = compact(affectedWidgets.map((widget: any) => loadWidget(widget, forceRefresh).catch((error: any) => error)));
        return Promise.all(loadWidgetPromises).then(() => {
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            const queryResults = compact(map(dashboardRef.current.widgets, widget => widget.getQueryResult()));
            const updatedFilters = collectDashboardFilters(dashboardRef.current, queryResults, location.search);
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'unknown[]' is not assignable to ... Remove this comment to see the full error message
            setFilters(updatedFilters);
        });
    }, [loadWidget]);
    const refreshDashboard = useCallback(updatedParameters => {
        if (!refreshing) {
            setRefreshing(true);
            loadDashboard(true, updatedParameters).finally(() => setRefreshing(false));
        }
    }, [refreshing, loadDashboard]);
    const archiveDashboard = useCallback(() => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("archive", "dashboard", dashboard.id);
        (Dashboard as any).delete(dashboard).then((updatedDashboard: any) => setDashboard((currentDashboard: any) => extend({}, currentDashboard, pick(updatedDashboard, ["is_archived"]))));
    }, [dashboard]); // eslint-disable-line react-hooks/exhaustive-deps
    const showShareDashboardDialog = useCallback(() => {
        const handleDialogClose = () => setDashboard((currentDashboard: any) => extend({}, currentDashboard));
        ShareDashboardDialog.showModal({
            dashboard,
            hasOnlySafeQueries,
        })
            .onClose(handleDialogClose)
            .onDismiss(handleDialogClose);
    }, [dashboard, hasOnlySafeQueries]);
    const showAddTextboxDialog = useCallback(() => {
        TextboxDialog.showModal({
            isNew: true,
        }).onClose((text: any) => dashboard.addWidget(text).then(() => setDashboard((currentDashboard: any) => extend({}, currentDashboard))));
    }, [dashboard]);
    const showAddWidgetDialog = useCallback(() => {
        AddWidgetDialog.showModal({
            dashboard,
        }).onClose(({ visualization, parameterMappings }: any) => dashboard
            .addWidget(visualization, {
            parameterMappings: editableMappingsToParameterMappings(parameterMappings),
        })
            .then((widget: any) => {
            const widgetsToSave = [
                widget,
                ...synchronizeWidgetTitles(widget.options.parameterMappings, dashboard.widgets),
            ];
            return Promise.all(widgetsToSave.map(w => w.save())).then(() => setDashboard((currentDashboard: any) => extend({}, currentDashboard)));
        }));
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
        isDashboardOwnerOrAdmin,
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
