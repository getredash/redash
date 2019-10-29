import { merge } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import { EditorPropTypes } from '@/visualizations';

import GeneralSettings from './GeneralSettings';
import ColorsSettings from './ColorsSettings';
import FormatSettings from './FormatSettings';
import BoundsSettings from './BoundsSettings';

import './editor.less';

export default function Editor(props) {
  const { options, onOptionsChange } = props;

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs animated={false} tabBarGutter={0}>
      <Tabs.TabPane key="general" tab={<span data-test="Choropleth.EditorTabs.General">General</span>}>
        <GeneralSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="colors" tab={<span data-test="Choropleth.EditorTabs.Colors">Colors</span>}>
        <ColorsSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="format" tab={<span data-test="Choropleth.EditorTabs.Format">Format</span>}>
        <FormatSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="bounds" tab={<span data-test="Choropleth.EditorTabs.Bounds">Bounds</span>}>
        <BoundsSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
