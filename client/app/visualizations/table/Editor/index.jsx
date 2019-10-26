import { merge } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import { EditorPropTypes } from '@/visualizations';

import ColumnsSettings from './ColumnsSettings';
import GridSettings from './GridSettings';

import './editor.less';

export default function index(props) {
  const { options, onOptionsChange } = props;

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs className="table-editor-container" animated={false} tabBarGutter={0}>
      <Tabs.TabPane key="columns" tab={<span data-test="Counter.EditorTabs.General">Columns</span>}>
        <ColumnsSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="grid" tab={<span data-test="Counter.EditorTabs.Formatting">Grid</span>}>
        <GridSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
    </Tabs>
  );
}

index.propTypes = EditorPropTypes;
