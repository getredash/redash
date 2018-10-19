import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
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
    const colorSelectItem = opt => (<span style={{
      width: 12, height: 12, backgroundColor: opt.value, display: 'inline-block', marginRight: 5,
    }}
    />);
    const colorOptionItem = opt => <span style={{ textTransform: 'capitalize' }}>{colorSelectItem(opt)}{opt.label}</span>;
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
                    value={this.props.options[name].color}
                    valueRenderer={colorSelectItem}
                    options={map(colors, (v, k) => ({ value: v, label: k }))}
                    optionRenderer={colorOptionItem}
                    clearable={false}
                    onChange={selection => this.changeColor(name, selection.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

