import { isFunction, map, filter, merge } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Tabs from 'antd/lib/tabs';
import { EditorPropTypes } from '@/visualizations';

export default function TabbedEditor({ tabs, options, data, onOptionsChange, ...restProps }) {
  const optionsChanged = (newOptions, updateFunction = merge) => {
    onOptionsChange(updateFunction({}, options, newOptions));
  };

  tabs = filter(tabs, tab => (isFunction(tab.isAvailable) ? tab.isAvailable(options, data) : true));

  return (
    <Tabs animated={false} tabBarGutter={0}>
      {map(tabs, ({ key, title, component: Component }) => (
        <Tabs.TabPane key={key} tab={<span data-test={`VisualizationEditor.Tabs.${key}`}>{title}</span>}>
          <Component options={options} data={data} onOptionsChange={optionsChanged} {...restProps} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}

TabbedEditor.propTypes = {
  ...EditorPropTypes,
  tabs: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    isAvailable: PropTypes.func, // (options) => boolean
    component: PropTypes.func.isRequired,
  })),
};

TabbedEditor.defaultProps = {
  tabs: [],
};
