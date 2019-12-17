import React from "react";
import PropTypes from "prop-types";
import { find, orderBy } from "lodash";
import Tabs from "antd/lib/tabs";
import { VisualizationRenderer } from "@/visualizations/VisualizationRenderer";
import Button from "antd/lib/button";

const { TabPane } = Tabs;

export default function QueryVisualizationTabs({ visualizations, queryResult, selectedTab,
  showNewVisualizationButton, onChangeTab, onClickNewVisualization }) {
  const tabsProps = {};
  if (find(visualizations, { id: selectedTab })) {
    tabsProps.activeKey = `${selectedTab}`;
  }

  if (showNewVisualizationButton) {
    tabsProps.tabBarExtraContent = (
      <Button onClick={onClickNewVisualization}>
        <i className="fa fa-plus" />
        <span className="m-l-5 hidden-xs">New Visualization</span>
      </Button>
    );
  }

  const orderedVisualizations = orderBy(visualizations, ["id"]);

  return (
    <Tabs {...tabsProps} onChange={activeKey => onChangeTab(+activeKey)}>
      {orderedVisualizations.map(visualization => (
        <TabPane key={`${visualization.id}`} tab={visualization.name}>
          <VisualizationRenderer visualization={visualization} queryResult={queryResult} context="query" />
        </TabPane>
      ))}
    </Tabs>
  );
}

QueryVisualizationTabs.propTypes = {
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  visualizations: PropTypes.arrayOf(PropTypes.object),
  selectedTab: PropTypes.number,
  showNewVisualizationButton: PropTypes.bool,
  onChangeTab: PropTypes.func,
  onClickNewVisualization: PropTypes.func,
};

QueryVisualizationTabs.defaultProps = {
  queryResult: null,
  visualizations: [],
  selectedTab: null,
  showNewVisualizationButton: false,
  onChangeTab: () => {},
  onClickNewVisualization: () => {},
};
