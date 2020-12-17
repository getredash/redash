import { isEmpty } from "lodash";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Button from "antd/lib/button";
import Checkbox from "antd/lib/checkbox";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import DynamicComponent from "@/components/DynamicComponent";
import DashboardGrid from "@/components/dashboards/DashboardGrid";
import Parameters from "@/components/Parameters";
import Filters from "@/components/Filters";
import { Dashboard } from "@/services/dashboard";
import recordEvent from "@/services/recordEvent";
import resizeObserver from "@/services/resizeObserver";
import routes from "@/services/routes";
import location from "@/services/location";
import url from "@/services/url";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import useDashboard from "./hooks/useDashboard";
import DashboardHeader from "./components/DashboardHeader";
import "./DashboardPage.less";
type DashboardSettingsProps = {
    dashboardOptions: any;
};
function DashboardSettings({ dashboardOptions }: DashboardSettingsProps) {
    const { dashboard, updateDashboard } = dashboardOptions;
    return (<div className="m-b-10 p-15 bg-white tiled">
      <Checkbox checked={!!dashboard.dashboard_filters_enabled} onChange={({ target }) => updateDashboard({ dashboard_filters_enabled: target.checked })} data-test="DashboardFiltersCheckbox">
        Use Dashboard Level Filters
      </Checkbox>
    </div>);
}
type AddWidgetContainerProps = {
    dashboardOptions: any;
    className?: string;
};
function AddWidgetContainer({ dashboardOptions, className, ...props }: AddWidgetContainerProps) {
    const { showAddTextboxDialog, showAddWidgetDialog } = dashboardOptions;
    return (<div className={cx("add-widget-container", className)} {...props}>
      <h2>
        <i className="zmdi zmdi-widgets"/>
        <span className="hidden-xs hidden-sm">
          Widgets are individual query visualizations or text boxes you can place on your dashboard in various
          arrangements.
        </span>
      </h2>
      <div>
        <Button className="m-r-15" onClick={showAddTextboxDialog} data-test="AddTextboxButton">
          Add Textbox
        </Button>
        <Button type="primary" onClick={showAddWidgetDialog} data-test="AddWidgetButton">
          Add Widget
        </Button>
      </div>
    </div>);
}
type DashboardComponentProps = {
    dashboard: any;
};
function DashboardComponent(props: DashboardComponentProps) {
    const dashboardOptions = useDashboard(props.dashboard);
    const { dashboard, filters, setFilters, loadDashboard, loadWidget, removeWidget, saveDashboardLayout, globalParameters, refreshDashboard, refreshWidget, editingLayout, setGridDisabled, } = dashboardOptions;
    const [pageContainer, setPageContainer] = useState(null);
    const [bottomPanelStyles, setBottomPanelStyles] = useState({});
    useEffect(() => {
        if (pageContainer) {
            const unobserve = resizeObserver(pageContainer, () => {
                if (editingLayout) {
                    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
                    const style = window.getComputedStyle(pageContainer, null);
                    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                    const bounds = pageContainer.getBoundingClientRect();
                    const paddingLeft = parseFloat(style.paddingLeft) || 0;
                    const paddingRight = parseFloat(style.paddingRight) || 0;
                    setBottomPanelStyles({
                        left: Math.round(bounds.left) + paddingRight,
                        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                        width: pageContainer.clientWidth - paddingLeft - paddingRight,
                    });
                }
                // reflow grid when container changes its size
                window.dispatchEvent(new Event("resize"));
            });
            return unobserve;
        }
    }, [pageContainer, editingLayout]);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
    return (<div className="container" ref={setPageContainer} data-test={`DashboardId${dashboard.id}Container`}>
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <DashboardHeader dashboardOptions={dashboardOptions} headerExtra={<DynamicComponent name="Dashboard.HeaderExtra" dashboard={dashboard} dashboardOptions={dashboardOptions}/>}/>
      {!isEmpty(globalParameters) && (<div className="dashboard-parameters m-b-10 p-15 bg-white tiled" data-test="DashboardParameters">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(updatedParameters: any) => void' is not ass... Remove this comment to see the full error message */}
          <Parameters parameters={globalParameters} onValuesChange={refreshDashboard}/>
        </div>)}
      {!isEmpty(filters) && (<div className="m-b-10 p-15 bg-white tiled" data-test="DashboardFilters">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<never[]>>' is not as... Remove this comment to see the full error message */}
          <Filters filters={filters} onChange={setFilters}/>
        </div>)}
      {editingLayout && <DashboardSettings dashboardOptions={dashboardOptions}/>}
      <div id="dashboard-container">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<boolean>>' is not as... Remove this comment to see the full error message */}
        <DashboardGrid dashboard={dashboard} widgets={dashboard.widgets} filters={filters} isEditing={editingLayout} onLayoutChange={editingLayout ? saveDashboardLayout : () => { }} onBreakpointChange={setGridDisabled} onLoadWidget={loadWidget} onRefreshWidget={refreshWidget} onRemoveWidget={removeWidget} onParameterMappingsChange={loadDashboard}/>
      </div>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ dashboardOptions: { gridDisabled: boolean;... Remove this comment to see the full error message */}
      {editingLayout && <AddWidgetContainer dashboardOptions={dashboardOptions} style={bottomPanelStyles}/>}
    </div>);
}
type OwnDashboardPageProps = {
    dashboardSlug?: string;
    dashboardId?: string;
    onError?: (...args: any[]) => any;
};
type DashboardPageProps = OwnDashboardPageProps & typeof DashboardPage.defaultProps;
function DashboardPage({ dashboardSlug, dashboardId, onError }: DashboardPageProps) {
    const [dashboard, setDashboard] = useState(null);
    const handleError = useImmutableCallback(onError);
    useEffect(() => {
        (Dashboard as any).get({ id: dashboardId, slug: dashboardSlug })
            .then((dashboardData: any) => {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
            recordEvent("view", "dashboard", dashboardData.id);
            setDashboard(dashboardData);
            // if loaded by slug, update location url to use the id
            if (!dashboardId) {
                location.setPath(url.parse(dashboardData.url).pathname, true);
            }
        })
            .catch(handleError);
    }, [dashboardId, dashboardSlug, handleError]);
    return <div className="dashboard-page">{dashboard && <DashboardComponent dashboard={dashboard}/>}</div>;
}
DashboardPage.defaultProps = {
    dashboardSlug: null,
    dashboardId: null,
    onError: PropTypes.func,
};
// route kept for backward compatibility
// @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ path: string; render: (pagePro... Remove this comment to see the full error message
routes.register("Dashboards.LegacyViewOrEdit", routeWithUserSession({
    path: "/dashboard/:dashboardSlug",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ pageTitle?: string | undefined; onError: (... Remove this comment to see the full error message
    render: pageProps => <DashboardPage {...pageProps}/>,
}));
// @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ path: string; render: (pagePro... Remove this comment to see the full error message
routes.register("Dashboards.ViewOrEdit", routeWithUserSession({
    path: "/dashboards/:dashboardId([^-]+)(-.*)?",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ pageTitle?: string | undefined; onError: (... Remove this comment to see the full error message
    render: pageProps => <DashboardPage {...pageProps}/>,
}));
