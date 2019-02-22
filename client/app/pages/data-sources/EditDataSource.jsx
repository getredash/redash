import React from 'react';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { DataSource } from '@/services/data-source';
import { $route } from '@/services/ng';
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

  render() {
    const { dataSource, type } = this.state;

    return (
      <div className="row">
        {(dataSource && type) && <EditDataSourceForm dataSource={dataSource} type={type} />}
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
