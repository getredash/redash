import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';

import { ClientConfig } from '@/components/proptypes';

const chartTypes = [
  { value: 'line', label: 'Line', icon: 'line-chart' },
  { value: 'column', label: 'Bar', icon: 'bar-chart' },
  { value: 'area', label: 'Area', icon: 'area-chart' },
  { value: 'pie', label: 'Pie', icon: 'pie-chart' },
  { value: 'scatter', label: 'Scatter', icon: 'circle-o' },
  { value: 'bubble', label: 'Bubble', icon: 'circle-o' },
  { value: 'heatmap', label: 'Heatmap', icon: 'th' },
  { value: 'box', label: 'Box', icon: 'square-o' },
];

export default class ChartTypePicker extends React.Component {
  static propTypes = {
    value: PropTypes.oneOf([...chartTypes.map(t => t.value), 'custom']).isRequired,
    onChange: PropTypes.func.isRequired,
    clientConfig: ClientConfig.isRequired,
  }

  constructor(props) {
    super(props);
    this.chartTypes = chartTypes;
    if (props.clientConfig.allowCustomJSVisualizations) {
      this.chartTypes = [...chartTypes, { value: 'custom', label: 'Custom', icon: 'code' }];
    }
  }

  typeItem = (opt, i) => <div><i className={'fa fa-' + opt.icon} /> {opt.label}</div>;
  render() {
    return (
      <Select
        value={this.props.value}
        onChange={this.props.onChange}
      >
        {this.chartTypes.map(c => (
          <Select.Option key={c.value}>
            <div>
              <i className={`fa fa-${c.icon}`} /> {c.label}
            </div>
          </Select.Option>))}
      </Select>
    );
  }
}
