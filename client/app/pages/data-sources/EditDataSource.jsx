import React from 'react';
import { get, find, toUpper } from 'lodash';
import { react2angular } from 'react2angular';
import Modal from 'antd/lib/modal';
import { DataSource, IMG_ROOT } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import { $route, toastr } from '@/services/ng';
import LoadingState from '@/components/items-list/components/LoadingState';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';
import { HelpTrigger, TYPES as HELP_TRIGGER_TYPES } from '@/components/HelpTrigger';

class EditDataSource extends React.Component {
  state = {
    dataSource: null,
    type: null,
    loading: true,
  };

  componentDidMount() {
    DataSource.get({ id: $route.current.params.dataSourceId }, (dataSource) => {
      const { type } = dataSource;
      this.setState({ dataSource });
      DataSource.types(types => this.setState({ type: find(types, { type }), loading: false }));
    });
  }

  saveDataSource = (values, successCallback, errorCallback) => {
    const { dataSource } = this.state;
    helper.updateTargetWithValues(dataSource, values);
    dataSource.$save(
      () => successCallback('Saved.'),
      (error) => {
        const message = get(error, 'data.message', 'Failed saving.');
        errorCallback(message);
      },
    );
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

  renderForm() {
    const { dataSource, type } = this.state;
    const fields = helper.getFields(type.configuration_schema, dataSource);
    const helpTriggerType = `DS_${toUpper(type.type)}`;
    const formProps = {
      fields,
      type,
      actions: [
        { name: 'Delete', type: 'danger', callback: this.deleteDataSource },
        { name: 'Test Connection', pullRight: true, callback: this.testConnection, disableWhenDirty: true },
      ],
      onSubmit: this.saveDataSource,
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="DataSource">
        <div className="text-right m-r-10">
          {HELP_TRIGGER_TYPES[helpTriggerType] && (
            <HelpTrigger className="f-13" type={helpTriggerType}>
              Setup Instructions <i className="fa fa-question-circle" />
            </HelpTrigger>
          )}
        </div>
        <div className="text-center m-b-10">
          <img className="p-5" src={`${IMG_ROOT}/${type.type}.png`} alt={type.name} width="64" />
          <h3 className="m-0">{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4 m-b-10">
          <DynamicForm {...formProps} />
        </div>
      </div>
    );
  }

  render() {
    return this.state.loading ? <LoadingState className="" /> : this.renderForm();
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
