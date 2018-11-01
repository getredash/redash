import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Drawer from 'antd/lib/drawer';
import Table from 'antd/lib/table';

import { DataSourceMetadata } from '@/components/proptypes';

function textWrapRenderer(text) {
  return (
    <div style={{ wordWrap: 'break-word', wordBreak: 'break-all' }}>
      {text}
    </div>
  );
}

class SchemaData extends React.PureComponent {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    tableName: PropTypes.string,
    tableDescription: PropTypes.string,
    tableMetadata: PropTypes.arrayOf(DataSourceMetadata),
  };

  static defaultProps = {
    tableName: '',
    tableDescription: '',
    tableMetadata: [],
  };

  render() {
    const columns = [{
      title: 'Column Name',
      dataIndex: 'name',
      width: 400,
      key: 'name',
      render: textWrapRenderer,
    }, {
      title: 'Column Type',
      dataIndex: 'type',
      width: 400,
      key: 'type',
      render: textWrapRenderer,
    }];

    const hasDescription =
      this.props.tableMetadata.some(columnMetadata => columnMetadata.description);

    const hasExample =
      this.props.tableMetadata.some(columnMetadata => columnMetadata.example);

    if (hasDescription) {
      columns.push({
        title: 'Description',
        dataIndex: 'description',
        width: 400,
        key: 'description',
        render: textWrapRenderer,
      });
    }

    if (hasExample) {
      columns.push({
        title: 'Example',
        dataIndex: 'example',
        width: 400,
        key: 'example',
        render: textWrapRenderer,
      });
    }

    return (
      <Drawer
        title={this.props.tableName}
        closable={false}
        placement="bottom"
        height={500}
        onClose={this.props.onClose}
        visible={this.props.show}
      >
        <h5 className="table-description">
          {this.props.tableDescription}
        </h5>
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
