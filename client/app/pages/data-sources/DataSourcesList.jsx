import React from 'react';
import Button from 'antd/lib/button';
import { react2angular } from 'react2angular';
import { isEmpty } from 'lodash';
import settingsMenu from '@/services/settingsMenu';
import { DataSource } from '@/services/data-source';
import { policy } from '@/services/policy';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/type-picker/TypePicker';
import LoadingState from '@/components/items-list/components/LoadingState';

class DataSourcesList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSources: [], loading: true };
  }

  componentDidMount() {
    DataSource.query(dataSources => this.setState({ dataSources, loading: false }));
  }

  renderDataSources() {
    const { dataSources } = this.state;
    const types = dataSources.map(dataSource => ({
      name: dataSource.name,
      type: dataSource.type,
      imgSrc: `${DataSource.IMG_ROOT}/${dataSource.type}.png`,
      onClick: () => navigateTo(`data_sources/${dataSource.id}`),
    }));

    return isEmpty(dataSources) ? (
      <div className="text-center">
        There are no data sources yet.
        <div className="m-t-5">
          <a href="data_sources/new">Click here</a> to add one.
        </div>
      </div>
    ) : (<TypePicker types={types} hideSearch />);
  }

  render() {
    const newDataSourceProps = {
      type: 'primary',
      href: policy.isCreateDataSourceEnabled() ? 'data_sources/new' : null,
      disabled: !policy.isCreateDataSourceEnabled(),
    };

    return (
      <div>
        <div className="m-b-15">
          <Button {...newDataSourceProps}>
            <i className="fa fa-plus m-r-5" />
            New Data Source
          </Button>
        </div>
        {this.state.loading ? <LoadingState className="" /> : this.renderDataSources()}
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
