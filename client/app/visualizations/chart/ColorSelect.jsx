import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import 'antd/lib/select/style';
import { map } from 'lodash';

import { ColorPalette } from '@/visualizations/chart/plotly/utils';


const colors = { Automatic: null, ...ColorPalette };
const colorSelectItem = v => (
  <span
    style={{
    width: 12,
    height: 12,
    backgroundColor: v,
    display: 'inline-block',
    marginRight: 5,
    }}
  />);
const colorOptionItem = (v, k) => <span style={{ textTransform: 'capitalize' }}>{colorSelectItem(v)}{k}</span>;


export default function ColorSelect(props) {
  return (
    <Select
      defaultActiveFirstOption
      value={props.value || 'Automatic'}
      onChange={props.onChange}
    >
      {map(colors, (v, k) => <Select.Option key={v}>{colorOptionItem(v, k)}</Select.Option>)}
    </Select>);
}

ColorSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
