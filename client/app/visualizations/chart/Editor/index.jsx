import { merge } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import { EditorPropTypes } from '@/visualizations';

import GeneralSettings from './GeneralSettings';
import XAxisSettings from './XAxisSettings';
import YAxisSettings from './YAxisSettings';
import SeriesSettings from './SeriesSettings';
import ColorsSettings from './ColorsSettings';
import DataLabelsSettings from './DataLabelsSettings';

export default function Editor(props) {
  const { options, onOptionsChange } = props;

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs animated={false} tabBarGutter={0}>
      <Tabs.TabPane key="general" tab={<span data-test="Chart.EditorTabs.General">General</span>}>
        <GeneralSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="x-axis" tab={<span data-test="Chart.EditorTabs.XAxis">X Axis</span>}>
        <XAxisSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="y-axis" tab={<span data-test="Chart.EditorTabs.YAxis">Y Axis</span>}>
        <YAxisSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="series" tab={<span data-test="Chart.EditorTabs.Series">Series</span>}>
        <SeriesSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="colors" tab={<span data-test="Chart.EditorTabs.Colors">Colors</span>}>
        <ColorsSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="data labels" tab={<span data-test="Chart.EditorTabs.DataLabels">Data Labels</span>}>
        <DataLabelsSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
