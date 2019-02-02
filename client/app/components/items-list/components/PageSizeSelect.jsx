import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import ItemsListContext from '../ItemsListContext';
import { clientConfig } from '@/services/auth';

export default class PageSizeSelect extends React.Component {
  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.number),
  };

  static defaultProps = {
    items: null, // defaults to `clientConfig.pageSizeOptions`, but it's not available on this stage
  };

  static contextType = ItemsListContext;

  render() {
    const items = this.props.items || clientConfig.pageSizeOptions;
    return (
      <div className="m-b-10">
        <div className="m-b-10">
          <Select
            className="w-100"
            defaultValue={this.context.itemsPerPage}
            onChange={pageSize => this.context.updatePaginator({ pageSize })}
          >
            {map(items, option => (
              <Select.Option key={option} value={option}>{ option } results</Select.Option>
            ))}
          </Select>
        </div>
      </div>
    );
  }
}
