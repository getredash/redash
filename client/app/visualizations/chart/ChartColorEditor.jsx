import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import 'antd/lib/select/style';
import { map } from 'lodash';

import { ColorPalette } from '@/visualizations/chart/plotly/utils';
import { SeriesOptions, ValuesOptions } from '@/components/proptypes';

const colors = { Automatic: null, ...ColorPalette };

export default class ChartColorEditor extends React.Component {
  static propTypes = {
    list: PropTypes.arrayOf(PropTypes.string).isRequired,
    options: PropTypes.oneOfType([SeriesOptions, ValuesOptions]).isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateOptions = (k, v) => {
    this.props.updateOptions({
      ...this.props.options,
      [k]: { ...this.props.options[k], ...v },
    });
  }

  changeColor = (value, color) => this.updateOptions(value, { color });

  render() {
    const colorSelectItem = v => (<span style={{
      width: 12, height: 12, backgroundColor: v, display: 'inline-block', marginRight: 5,
    }}
    />);
    const colorOptionItem = (v, k) => <span style={{ textTransform: 'capitalize' }}>{colorSelectItem(v)}{k}</span>;
    return (
      <div className="m-t-10 m-b-10">
        <table className="table table-condensed col-table">
          <tbody>
            {map(this.props.list, name => (
              <tr key={name}>
                <td style={{ padding: 3, width: 140 }}>
                  <div>{name}</div>
                </td>
                <td style={{ padding: 3, width: 35 }}>
                  <Select
                    defaultActiveFirstOption
                    value={this.props.options[name].color || 'Automatic'}
                    onChange={selection => this.changeColor(name, selection)}
                  >
                    {map(colors, (v, k) => <Select.Option key={v}>{colorOptionItem(v, k)}</Select.Option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

