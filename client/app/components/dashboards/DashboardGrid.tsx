import React from "react";
import PropTypes from "prop-types";
import { chain, cloneDeep, find } from "lodash";
import cx from "classnames";
import { Responsive, WidthProvider } from "react-grid-layout";
import { VisualizationWidget, TextboxWidget, RestrictedWidget } from "@/components/dashboards/dashboard-widget";
// @ts-expect-error ts-migrate(6133) FIXME: 'FiltersType' is declared but its value is never r... Remove this comment to see the full error message
import { FiltersType } from "@/components/Filters";
import cfg from "@/config/dashboard-grid-options";
import AutoHeightController from "./AutoHeightController";
import { WidgetTypeEnum } from "@/services/widget";
import "react-grid-layout/css/styles.css";
import "./dashboard-grid.less";
const ResponsiveGridLayout = WidthProvider(Responsive);
type WidgetType = {
    id: number;
    options: {
        position: {
            col: number;
            row: number;
            sizeY: number;
            minSizeY: number;
            maxSizeY: number;
            sizeX: number;
            minSizeX: number;
            maxSizeX: number;
        };
    };
};
const WidgetType: PropTypes.Requireable<WidgetType> = PropTypes.shape({
    id: PropTypes.number.isRequired,
    options: PropTypes.shape({
        position: PropTypes.shape({
            col: PropTypes.number.isRequired,
            row: PropTypes.number.isRequired,
            sizeY: PropTypes.number.isRequired,
            minSizeY: PropTypes.number.isRequired,
            maxSizeY: PropTypes.number.isRequired,
            sizeX: PropTypes.number.isRequired,
            minSizeX: PropTypes.number.isRequired,
            maxSizeX: PropTypes.number.isRequired,
        }).isRequired,
    }).isRequired,
});
const SINGLE = "single-column";
const MULTI = "multi-column";
// @ts-expect-error ts-migrate(2339) FIXME: Property 'widget' does not exist on type '{ childr... Remove this comment to see the full error message
const DashboardWidget = React.memo(function DashboardWidget({ widget, dashboard, onLoadWidget, onRefreshWidget, onRemoveWidget, onParameterMappingsChange, canEdit, isPublic, isLoading, filters, }) {
    const { type } = widget;
    const onLoad = () => onLoadWidget(widget);
    const onRefresh = () => onRefreshWidget(widget);
    const onDelete = () => onRemoveWidget(widget.id);
    if (type === WidgetTypeEnum.VISUALIZATION) {
        return (<VisualizationWidget widget={widget} dashboard={dashboard} filters={filters} canEdit={canEdit} isPublic={isPublic} isLoading={isLoading} onLoad={onLoad} onRefresh={onRefresh} onDelete={onDelete} onParameterMappingsChange={onParameterMappingsChange}/>);
    }
    if (type === WidgetTypeEnum.TEXTBOX) {
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ widget: any; canEdit: any; isPublic: any; ... Remove this comment to see the full error message
        return <TextboxWidget widget={widget} canEdit={canEdit} isPublic={isPublic} onDelete={onDelete}/>;
    }
    return <RestrictedWidget widget={widget}/>;
}, (prevProps, nextProps) => (prevProps as any).widget === (nextProps as any).widget &&
    (prevProps as any).canEdit === (nextProps as any).canEdit &&
    (prevProps as any).isPublic === (nextProps as any).isPublic &&
    (prevProps as any).isLoading === (nextProps as any).isLoading &&
    (prevProps as any).filters === (nextProps as any).filters);
type OwnProps = {
    isEditing: boolean;
    isPublic?: boolean;
    dashboard: any;
    widgets: WidgetType[];
    // @ts-expect-error ts-migrate(2749) FIXME: 'FiltersType' refers to a value, but is being used... Remove this comment to see the full error message
    filters?: FiltersType;
    onBreakpointChange?: (...args: any[]) => any;
    onLoadWidget?: (...args: any[]) => any;
    onRefreshWidget?: (...args: any[]) => any;
    onRemoveWidget?: (...args: any[]) => any;
    onLayoutChange?: (...args: any[]) => any;
    onParameterMappingsChange?: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof DashboardGrid.defaultProps;
class DashboardGrid extends React.Component<Props, State> {
    static defaultProps = {
        isPublic: false,
        filters: [],
        onLoadWidget: () => { },
        onRefreshWidget: () => { },
        onRemoveWidget: () => { },
        onLayoutChange: () => { },
        onBreakpointChange: () => { },
        onParameterMappingsChange: () => { },
    };
    static normalizeFrom(widget: any) {
        const { id, options: { position: pos }, } = widget;
        return {
            i: id.toString(),
            x: pos.col,
            y: pos.row,
            w: pos.sizeX,
            h: pos.sizeY,
            minW: pos.minSizeX,
            maxW: pos.maxSizeX,
            minH: pos.minSizeY,
            maxH: pos.maxSizeY,
        };
    }
    mode = null;
    autoHeightCtrl = null;
    constructor(props: Props) {
        super(props);
        this.state = {
            layouts: {},
            disableAnimations: true,
        };
        // init AutoHeightController
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'AutoHeightController' is not assignable to t... Remove this comment to see the full error message
        this.autoHeightCtrl = new AutoHeightController(this.onWidgetHeightUpdated);
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        this.autoHeightCtrl.update(this.props.widgets);
    }
    componentDidMount() {
        this.onBreakpointChange(document.body.offsetWidth <= cfg.mobileBreakPoint ? SINGLE : MULTI);
        // Work-around to disable initial animation on widgets; `measureBeforeMount` doesn't work properly:
        // it disables animation, but it cannot detect scrollbars.
        setTimeout(() => {
            this.setState({ disableAnimations: false });
        }, 50);
    }
    componentDidUpdate() {
        // update, in case widgets added or removed
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        this.autoHeightCtrl.update(this.props.widgets);
    }
    componentWillUnmount() {
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        this.autoHeightCtrl.destroy();
    }
    onLayoutChange = (_: any, layouts: any) => {
        // workaround for when dashboard starts at single mode and then multi is empty or carries single col data
        // fixes test dashboard_spec['shows widgets with full width']
        // TODO: open react-grid-layout issue
        if (layouts[MULTI]) {
            this.setState({ layouts });
        }
        // workaround for https://github.com/STRML/react-grid-layout/issues/889
        // remove next line when fix lands
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"single-column" | "multi-column"' is not ass... Remove this comment to see the full error message
        this.mode = document.body.offsetWidth <= cfg.mobileBreakPoint ? SINGLE : MULTI;
        // end workaround
        // don't save single column mode layout
        if (this.mode === SINGLE) {
            return;
        }
        const normalized = chain(layouts[MULTI])
            .keyBy("i")
            .mapValues(this.normalizeTo)
            .value();
        this.props.onLayoutChange(normalized);
    };
    onBreakpointChange = (mode: any) => {
        this.mode = mode;
        this.props.onBreakpointChange(mode === SINGLE);
    };
    // height updated by auto-height
    onWidgetHeightUpdated = (widgetId: any, newHeight: any) => {
        this.setState(({ layouts }: any) => {
            const layout = cloneDeep(layouts[MULTI]); // must clone to allow react-grid-layout to compare prev/next state
            const item = find(layout, { i: widgetId.toString() });
            if (item) {
                // update widget height
                item.h = Math.ceil((newHeight + cfg.margins) / cfg.rowHeight);
            }
            return { layouts: { [MULTI]: layout } };
        });
    };
    // height updated by manual resize
    onWidgetResize = (layout: any, oldItem: any, newItem: any) => {
        if (oldItem.h !== newItem.h) {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            this.autoHeightCtrl.remove(Number(newItem.i));
        }
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        this.autoHeightCtrl.resume();
    };
    normalizeTo = (layout: any) => ({
        col: layout.x,
        row: layout.y,
        sizeX: layout.w,
        sizeY: layout.h,
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        autoHeight: this.autoHeightCtrl.exists(layout.i)
    });
    render() {
        const className = cx("dashboard-wrapper", this.props.isEditing ? "editing-mode" : "preview-mode");
        const { onLoadWidget, onRefreshWidget, onRemoveWidget, onParameterMappingsChange, filters, dashboard, isPublic, widgets, } = this.props;
        return (<div className={className}>
        {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
        <ResponsiveGridLayout draggableCancel="input" className={cx("layout", { "disable-animations": this.state.disableAnimations })} cols={{ [MULTI]: cfg.columns, [SINGLE]: 1 }} rowHeight={cfg.rowHeight - cfg.margins} margin={[cfg.margins, cfg.margins]} isDraggable={this.props.isEditing} isResizable={this.props.isEditing} onResizeStart={this.autoHeightCtrl.stop} onResizeStop={this.onWidgetResize} layouts={this.state.layouts} onLayoutChange={this.onLayoutChange} onBreakpointChange={this.onBreakpointChange} breakpoints={{ [MULTI]: cfg.mobileBreakPoint, [SINGLE]: 0 }}>
          {widgets.map(widget => (<div key={widget.id} data-grid={DashboardGrid.normalizeFrom(widget)} data-widgetid={widget.id} data-test={`WidgetId${widget.id}`} className={cx("dashboard-widget-wrapper", {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            "widget-auto-height-enabled": this.autoHeightCtrl.exists(widget.id),
        })}>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ dashboard: any; widget: WidgetType; filter... Remove this comment to see the full error message */}
              <DashboardWidget dashboard={dashboard} widget={widget} filters={filters} isPublic={isPublic} isLoading={(widget as any).loading} canEdit={dashboard.canEdit()} onLoadWidget={onLoadWidget} onRefreshWidget={onRefreshWidget} onRemoveWidget={onRemoveWidget} onParameterMappingsChange={onParameterMappingsChange}/>
            </div>))}
        </ResponsiveGridLayout>
      </div>);
    }
}
export default DashboardGrid;
