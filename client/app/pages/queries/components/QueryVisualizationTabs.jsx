import React from 'react';
import PropTypes from 'prop-types';
import Tabs from 'antd/lib/tabs';
import { VisualizationRenderer } from '@/visualizations/VisualizationRenderer';
import Button from 'antd/lib/button';

const { TabPane } = Tabs;

export default function QueryVisualizationTabs({ visualizations, queryResult, currentVisualizationId }) {
  const tabsProps = {};
  if (find(visualizations, { id: +currentVisualizationId })) {
    tabsProps.activeKey = `${currentVisualizationId}`;
  }

  return (
    <Tabs {...tabsProps} tabBarExtraContent={(<Button><i className="fa fa-plus m-r-5" />New Visualization</Button>)}>
      {visualizations.map(visualization => (
        <TabPane key={`${visualization.id}`} tab={visualization.name}>
          <VisualizationRenderer
            visualization={visualization}
            queryResult={queryResult}
            context="query"
          />
        </TabPane>
      ))}
    </Tabs>
  );
}

QueryVisualizationTabs.propTypes = {
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  visualizations: PropTypes.arrayOf(PropTypes.object),
  currentVisualizationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
QueryVisualizationTabs.defaultProps = { queryResult: null, visualizations: [], currentVisualizationId: null };
