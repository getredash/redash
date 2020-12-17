import _ from "lodash";
import { axios } from "@/services/axios";
import dashboardGridOptions from "@/config/dashboard-grid-options";
import Widget from "./widget";
import location from "@/services/location";
import { cloneParameter } from "@/services/parameters";
import { policy } from "@/services/policy";
export const urlForDashboard = ({ id, slug }: any) => `dashboards/${id}-${slug}`;
export function collectDashboardFilters(dashboard: any, queryResults: any, urlParams: any) {
    const filters = {};
    _.each(queryResults, queryResult => {
        const queryFilters = queryResult && queryResult.getFilters ? queryResult.getFilters() : [];
        _.each(queryFilters, queryFilter => {
            const hasQueryStringValue = _.has(urlParams, queryFilter.name);
            if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
                // If dashboard filters not enabled, or no query string value given,
                // skip filters linking.
                return;
            }
            if (hasQueryStringValue) {
                queryFilter.current = urlParams[queryFilter.name];
            }
            const filter = { ...queryFilter };
            if (!_.has(filters, queryFilter.name)) {
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                filters[filter.name] = filter;
            }
            else {
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                filters[filter.name].values = _.union(filters[filter.name].values, filter.values);
            }
        });
    });
    return _.values(filters);
}
function prepareWidgetsForDashboard(widgets: any) {
    // Default height for auto-height widgets.
    // Compute biggest widget size and choose between it and some magic number.
    // This value should be big enough so auto-height widgets will not overlap other ones.
    const defaultWidgetSizeY = Math.max(_.chain(widgets)
        .map(w => w.options.position.sizeY)
        .max()
        .value(), 20) + 5;
    // Fix layout:
    // 1. sort and group widgets by row
    // 2. update position of widgets in each row - place it right below
    //    biggest widget from previous row
    _.chain(widgets)
        .sortBy(widget => widget.options.position.row)
        .groupBy(widget => widget.options.position.row)
        .reduce((row, widgetsAtRow) => {
        let height = 1;
        _.each(widgetsAtRow, widget => {
            height = Math.max(height, widget.options.position.autoHeight ? defaultWidgetSizeY : widget.options.position.sizeY);
            widget.options.position.row = row;
            if (widget.options.position.sizeY < 1) {
                widget.options.position.sizeY = defaultWidgetSizeY;
            }
        });
        return row + height;
    }, 0)
        .value();
    // Sort widgets by updated column and row value
    widgets = _.sortBy(widgets, widget => widget.options.position.col);
    widgets = _.sortBy(widgets, widget => widget.options.position.row);
    return widgets;
}
function calculateNewWidgetPosition(existingWidgets: any, newWidget: any) {
    const width = _.extend({ sizeX: dashboardGridOptions.defaultSizeX }, _.extend({}, newWidget.options).position).sizeX;
    // Find first free row for each column
    const bottomLine = _.chain(existingWidgets)
        .map(w => {
        const options = _.extend({}, w.options);
        const position = _.extend({ row: 0, sizeY: 0 }, options.position);
        return {
            left: position.col,
            top: position.row,
            right: position.col + position.sizeX,
            bottom: position.row + position.sizeY,
            width: position.sizeX,
            height: position.sizeY,
        };
    })
        .reduce((result, item) => {
        const from = Math.max(item.left, 0);
        const to = Math.min(item.right, result.length + 1);
        for (let i = from; i < to; i += 1) {
            result[i] = Math.max(result[i], item.bottom);
        }
        return result;
    }, _.map(new Array(dashboardGridOptions.columns), _.constant(0)))
        .value();
    // Go through columns, pick them by count necessary to hold new block,
    // and calculate bottom-most free row per group.
    // Choose group with the top-most free row (comparing to other groups)
    return _.chain(_.range(0, dashboardGridOptions.columns - width + 1))
        .map(col => ({
        col,
        row: _.chain(bottomLine)
            .slice(col, col + width)
            .max()
            .value(),
    }))
        .sortBy("row")
        .first()
        .value();
}
export function Dashboard(dashboard: any) {
    // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
    _.extend(this, dashboard);
    // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
    Object.defineProperty(this, "url", {
        get: function () {
            return urlForDashboard(this);
        },
    });
}
function prepareDashboardWidgets(widgets: any) {
    return prepareWidgetsForDashboard(_.map(widgets, widget => new Widget(widget)));
}
function transformSingle(dashboard: any) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    dashboard = new Dashboard(dashboard);
    if (dashboard.widgets) {
        dashboard.widgets = prepareDashboardWidgets(dashboard.widgets);
    }
    dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
    return dashboard;
}
function transformResponse(data: any) {
    if (data.results) {
        data = { ...data, results: _.map(data.results, transformSingle) };
    }
    else {
        data = transformSingle(data);
    }
    return data;
}
const saveOrCreateUrl = (data: any) => data.id ? `api/dashboards/${data.id}` : "api/dashboards";
const DashboardService = {
    get: ({ id, slug }: any) => {
        const params = {};
        if (!id) {
            (params as any).legacy = null;
        }
        return axios.get(`api/dashboards/${id || slug}`, { params }).then(transformResponse);
    },
    getByToken: ({ token }: any) => axios.get(`api/dashboards/public/${token}`).then(transformResponse),
    save: (data: any) => axios.post(saveOrCreateUrl(data), data).then(transformResponse),
    delete: ({ id }: any) => axios.delete(`api/dashboards/${id}`).then(transformResponse),
    query: (params: any) => axios.get("api/dashboards", { params }).then(transformResponse),
    recent: (params: any) => axios.get("api/dashboards/recent", { params }).then(transformResponse),
    favorites: (params: any) => axios.get("api/dashboards/favorites", { params }).then(transformResponse),
    favorite: ({ id }: any) => axios.post(`api/dashboards/${id}/favorite`),
    unfavorite: ({ id }: any) => axios.delete(`api/dashboards/${id}/favorite`),
};
_.extend(Dashboard, DashboardService);
Dashboard.prepareDashboardWidgets = prepareDashboardWidgets;
Dashboard.prepareWidgetsForDashboard = prepareWidgetsForDashboard;
Dashboard.prototype.canEdit = function canEdit() {
    return policy.canEdit(this);
};
Dashboard.prototype.getParametersDefs = function getParametersDefs() {
    const globalParams = {};
    const queryParams = location.search;
    _.each(this.widgets, widget => {
        if (widget.getQuery()) {
            const mappings = widget.getParameterMappings();
            widget
                .getQuery()
                .getParametersDefs(false)
                .forEach((param: any) => {
                const mapping = mappings[param.name];
                if (mapping.type === Widget.MappingType.DashboardLevel) {
                    // create global param
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    if (!globalParams[mapping.mapTo]) {
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        globalParams[mapping.mapTo] = cloneParameter(param);
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        globalParams[mapping.mapTo].name = mapping.mapTo;
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        globalParams[mapping.mapTo].title = mapping.title || param.title;
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        globalParams[mapping.mapTo].locals = [];
                    }
                    // add to locals list
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    globalParams[mapping.mapTo].locals.push(param);
                }
            });
        }
    });
    return _.values(_.each(globalParams, param => {
        (param as any).setValue((param as any).value); // apply global param value to all locals
        (param as any).fromUrlParams(queryParams); // try to initialize from url (may do nothing)
    }));
};
Dashboard.prototype.addWidget = function addWidget(textOrVisualization: any, options = {}) {
    const props = {
        dashboard_id: this.id,
        options: {
            ...options,
            isHidden: false,
            position: {},
        },
        text: "",
        visualization_id: null,
        visualization: null,
    };
    if (_.isString(textOrVisualization)) {
        props.text = textOrVisualization;
    }
    else if (_.isObject(textOrVisualization)) {
        props.visualization_id = (textOrVisualization as any).id;
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'object' is not assignable to type 'null'.
        props.visualization = textOrVisualization;
    }
    else {
        // TODO: Throw an error?
    }
    const widget = new Widget(props);
    const position = calculateNewWidgetPosition(this.widgets, widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 0.
    return widget.save().then(() => {
        this.widgets = [...this.widgets, widget];
        return widget;
    });
};
Dashboard.prototype.favorite = function favorite() {
    return (Dashboard as any).favorite(this);
};
Dashboard.prototype.unfavorite = function unfavorite() {
    return (Dashboard as any).unfavorite(this);
};
