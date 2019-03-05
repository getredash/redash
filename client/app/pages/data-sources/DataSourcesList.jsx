import React from 'react';
import Button from 'antd/lib/button';
import { react2angular } from 'react2angular';
import { isEmpty, get } from 'lodash';
import settingsMenu from '@/services/settingsMenu';
import { DataSource } from '@/services/data-source';
import { policy } from '@/services/policy';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/type-picker/TypePicker';
import LoadingState from '@/components/items-list/components/LoadingState';
import CreateSourceDialog from '@/components/CreateSourceDialog';
import helper from '@/components/dynamic-form/dynamicFormHelper';

class DataSourcesList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSourceTypes: [], dataSources: [], loading: true };
  }

  componentDidMount() {
    DataSource.query(dataSources => this.setState({ dataSources, loading: false }));
    DataSource.types(dataSourceTypes => this.setState({ dataSourceTypes }));
  }

  createDataSource = (selectedType, values) => {
    const target = { options: {}, type: selectedType };
    helper.updateTargetWithValues(target, values);

    return DataSource.save(target).$promise.then(() => {
      this.setState({ loading: true });
      DataSource.query(dataSources => this.setState({ dataSources, loading: false }));
    }).catch((error) => {
      if (!(error instanceof Error)) {
        error = new Error(get(error, 'data.message', 'Failed saving.'));
      }
      return Promise.reject(error);
    });
  };

  showCreateSourceDialog = () => {
    CreateSourceDialog.showModal({
      types: this.state.dataSourceTypes,
      sourceType: 'Data Source',
      imageFolder: DataSource.IMG_ROOT,
      helpLinks: DataSource.HELP_LINKS,
      onCreate: this.createDataSource,
    });
  };

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
      onClick: policy.isCreateDataSourceEnabled() ? this.showCreateSourceDialog : null,
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
