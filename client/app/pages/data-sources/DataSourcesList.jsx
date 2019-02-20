import React from 'react';
import Button from 'antd/lib/button';
import { react2angular } from 'react2angular';
import settingsMenu from '@/services/settingsMenu';
import { DataSource } from '@/services/data-source';
import { policy } from '@/services/policy';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/TypePicker';

const IMG_ROOT = '/static/images/db-logos';

class DataSourcesList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSources: [] };
    DataSource.query(dataSources => this.setState({ dataSources }));
  }

  renderDataSources() {
    const { dataSources } = this.state;
    const types = dataSources.map(dataSource => ({
      name: dataSource.name,
      type: dataSource.type,
      imgSrc: `${IMG_ROOT}/${dataSource.type}.png`,
      onClick: () => navigateTo(`data_sources/${dataSource.id}`),
    }));

    return (<TypePicker types={types} />);
  }

  render() {
    return (
      <div>
        <div className="m-b-15">
          <Button type="primary" href="data_sources/new" disabled={!policy.isCreateDataSourceEnabled()}>
            <i className="fa fa-plus m-r-5" />
            New Data Source
          </Button>
          {this.renderDataSources()}
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: 'Data Sources',
    path: 'data_sources',
    order: 1,
  });

  ngModule.component('pageDataSourcesList', react2angular(DataSourcesList));

  return {
    '/data_sources': {
      template: '<settings-screen><page-data-sources-list></page-data-sources-list></settings-screen>',
      title: 'Data Sources',
    },
  };
}

init.init = true;
