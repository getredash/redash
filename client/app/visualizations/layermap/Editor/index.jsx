import { merge } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import { EditorPropTypes } from '@/visualizations';

import GeneralSettings from './GeneralSettings';
import MapViewSettings from './MapViewSettings';
import LayersSettings from './LayersSettings';

export default function Editor(props) {
  const { options, onOptionsChange } = props;

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs animated={false} tabBarGutter={0}>
      <Tabs.TabPane key="general" tab={<span data-test="Layermap.EditorTabs.General">General</span>}>
        <GeneralSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="map-view" tab={<span data-test="Layermap.EditorTabs.MapView">Map View</span>}>
        <MapViewSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="layers" tab={<span data-test="Layermap.EditorTabs.Layers">Layers</span>}>
        <LayersSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
