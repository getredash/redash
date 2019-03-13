import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Drawer from 'antd/lib/drawer';
import Table from 'antd/lib/table';

import { DataSourceMetadata } from '@/components/proptypes';

class SchemaData extends React.PureComponent {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    tableName: PropTypes.string,
    tableMetadata: PropTypes.arrayOf(DataSourceMetadata),
  };

  static defaultProps = {
    tableName: '',
    tableMetadata: [],
  };

  render() {
    const columns = [{
      title: 'Column Name',
      dataIndex: 'name',
      width: 400,
      key: 'name',
    }, {
      title: 'Column Type',
      dataIndex: 'type',
      width: 400,
      key: 'type',
    }, {
      title: 'Example',
      dataIndex: 'example',
      width: 400,
      key: 'example',
    }];

    return (
      <Drawer
        title={this.props.tableName}
        closable={false}
        placement="bottom"
        height={500}
        onClose={this.props.onClose}
        visible={this.props.show}
      >
        <Table
          dataSource={this.props.tableMetadata}
          pagination={false}
          scroll={{ y: 350 }}
          size="small"
          columns={columns}
        />
      </Drawer>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('schemaData', react2angular(SchemaData, null, []));
}

init.init = true;
