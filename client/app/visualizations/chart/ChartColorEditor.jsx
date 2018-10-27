import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

import { SeriesOptions, ValuesOptions } from '@/components/proptypes';
import ColorSelect from './ColorSelect';

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
                  <ColorSelect
                    value={this.props.options[name].color}
                    onChange={selection => this.changeColor(name, selection)}
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

