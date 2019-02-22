import React from 'react';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import Modal from 'antd/lib/modal';
import { DataSource } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import { $route, toastr } from '@/services/ng';
import EditDataSourceForm from '@/components/data-sources/EditDataSourceForm';

class EditDataSource extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSource: null, type: null };
  }

  componentDidMount() {
    DataSource.get({ id: $route.current.params.dataSourceId }, (dataSource) => {
      const { type } = dataSource;
      this.setState({ dataSource });
      DataSource.types(types => this.setState({ type: find(types, { type }) }));
    });
  }

  deleteDataSource = (callback) => {
    const { dataSource } = this.state;

    const doDelete = () => {
      dataSource.$delete(() => {
        toastr.success('Data source deleted successfully.');
        navigateTo('/data_sources', true);
      }, () => {
        callback();
      });
    };

    Modal.confirm({
      title: 'Delete Data Source',
      content: 'Are you sure you want to delete this data source?',
      okText: 'Delete',
      okType: 'danger',
      onOk: doDelete,
      onCancel: callback,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  testConnection = (callback) => {
    const { dataSource } = this.state;
    DataSource.test({ id: dataSource.id }, (httpResponse) => {
      if (httpResponse.ok) {
        toastr.success('Success');
      } else {
        toastr.error(httpResponse.message, 'Connection Test Failed:', { timeOut: 10000 });
      }
      callback();
    }, () => {
      toastr.error('Unknown error occurred while performing connection test. Please try again later.', 'Connection Test Failed:', { timeOut: 10000 });
      callback();
    });
  };

  render() {
    const { dataSource, type } = this.state;
    const formProps = {
      dataSource,
      type,
      actions: [
        { name: 'Delete', type: 'danger', callback: this.deleteDataSource },
        { name: 'Test Connection', pullRight: true, callback: this.testConnection, disableWhenDirty: true },
      ],
    };

    return (
      <div className="row">
        {(dataSource && type) && <EditDataSourceForm {...formProps} />}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageEditDataSource', react2angular(EditDataSource));

  return {
    '/data_sources/:dataSourceId': {
      template: '<settings-screen><page-edit-data-source></page-edit-data-source></settings-screen>',
      title: 'Data Sources',
    },
  };
}

init.init = true;
