import React, { useState, useMemo, useCallback } from "react";
import cx from "classnames";
import { find, orderBy } from "lodash";
import useMedia from "use-media";
import Tabs from "antd/lib/tabs";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import "./QueryVisualizationTabs.less";
const { TabPane } = Tabs;
type OwnEmptyStateProps = {
    title: string;
    message: string;
    refreshButton?: React.ReactNode;
};
type EmptyStateProps = OwnEmptyStateProps & typeof EmptyState.defaultProps;
function EmptyState({ title, message, refreshButton }: EmptyStateProps) {
    return (<div className="query-results-empty-state">
      <div className="empty-state-content">
        <div>
          <img src="static/images/illustrations/no-query-results.svg" alt="No Query Results Illustration"/>
        </div>
        <h3>{title}</h3>
        <div className="m-b-20">{message}</div>
        {refreshButton}
      </div>
    </div>);
}
EmptyState.defaultProps = {
    refreshButton: null,
};
type OwnTabWithDeleteButtonProps = {
    visualizationName: string;
    canDelete?: boolean;
    onDelete?: (...args: any[]) => any;
};
type TabWithDeleteButtonProps = OwnTabWithDeleteButtonProps & typeof TabWithDeleteButton.defaultProps;
function TabWithDeleteButton({ visualizationName, canDelete, onDelete, ...props }: TabWithDeleteButtonProps) {
    const handleDelete = useCallback(e => {
        e.stopPropagation();
        Modal.confirm({
            title: "Delete Visualization",
            content: "Are you sure you want to delete this visualization?",
            okText: "Delete",
            okType: "danger",
            onOk: onDelete,
            maskClosable: true,
            autoFocusButton: null,
        });
    }, [onDelete]);
    return (<span {...props}>
      {visualizationName}
      {canDelete && (<a className="delete-visualization-button" onClick={handleDelete}>
          <i className="zmdi zmdi-close"/>
        </a>)}
    </span>);
}
TabWithDeleteButton.defaultProps = { canDelete: false, onDelete: () => { } };
const defaultVisualizations = [
    {
        type: "TABLE",
        name: "Table",
        id: null,
        options: {},
    },
];
type OwnQueryVisualizationTabsProps = {
    queryResult?: any;
    visualizations?: any[];
    selectedTab?: number;
    showNewVisualizationButton?: boolean;
    canDeleteVisualizations?: boolean;
    onChangeTab?: (...args: any[]) => any;
    onAddVisualization?: (...args: any[]) => any;
    onDeleteVisualization?: (...args: any[]) => any;
    refreshButton?: React.ReactNode;
    canRefresh?: boolean;
};
type QueryVisualizationTabsProps = OwnQueryVisualizationTabsProps & typeof QueryVisualizationTabs.defaultProps;
// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function QueryVisualizationTabs({ queryResult, selectedTab, showNewVisualizationButton, canDeleteVisualizations, onChangeTab, onAddVisualization, onDeleteVisualization, refreshButton, canRefresh, ...props }: QueryVisualizationTabsProps) {
    const visualizations = useMemo(() => (props.visualizations.length > 0 ? props.visualizations : defaultVisualizations), [props.visualizations]);
    const tabsProps = {};
    if (find(visualizations, { id: selectedTab })) {
        (tabsProps as any).activeKey = `${selectedTab}`;
    }
    if (showNewVisualizationButton) {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        (tabsProps as any).tabBarExtraContent = (<Button className="add-visualization-button" data-test="NewVisualization" type="link" onClick={() => onAddVisualization()}>
        <i className="fa fa-plus"/>
        <span className="m-l-5 hidden-xs">Add Visualization</span>
      </Button>);
    }
    const orderedVisualizations = useMemo(() => orderBy(visualizations, ["id"]), [visualizations]);
    const isFirstVisualization = useCallback(visId => visId === orderedVisualizations[0].id, [orderedVisualizations]);
    const isMobile = useMedia({ maxWidth: 768 });
    const [filters, setFilters] = useState([]);
    // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
    return (<Tabs {...tabsProps} type="card" className={cx("query-visualization-tabs card-style")} data-test="QueryPageVisualizationTabs" animated={false} tabBarGutter={0} onChange={activeKey => onChangeTab(+activeKey)} destroyInactiveTabPane>
      {/* @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable. */}
      {orderedVisualizations.map(visualization => (<TabPane key={`${visualization.id}`} tab={<TabWithDeleteButton data-test={`QueryPageVisualizationTab${visualization.id}`} canDelete={!isMobile && canDeleteVisualizations && !isFirstVisualization(visualization.id)} visualizationName={visualization.name} onDelete={() => onDeleteVisualization(visualization.id)}/>}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<never[]>>' is not as... Remove this comment to see the full error message */}
          {queryResult ? (<VisualizationRenderer visualization={visualization} queryResult={queryResult} context="query" filters={filters} onFiltersChange={setFilters}/>) : (<EmptyState title="Query has no result" message={canRefresh
        ? "Execute/Refresh the query to show results."
        : "You do not have a permission to execute/refresh this query."} refreshButton={refreshButton}/>)}
        </TabPane>))}
    </Tabs>);
}
QueryVisualizationTabs.defaultProps = {
    queryResult: null,
    visualizations: [],
    selectedTab: null,
    showNewVisualizationButton: false,
    canDeleteVisualizations: false,
    onChangeTab: () => { },
    onAddVisualization: () => { },
    onDeleteVisualization: () => { },
    refreshButton: null,
    canRefresh: true,
};
