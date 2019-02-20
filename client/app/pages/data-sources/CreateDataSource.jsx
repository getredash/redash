import React from 'react';
import Steps from 'antd/lib/steps';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { DataSource } from '@/services/data-source';
import TypePicker from '@/components/TypePicker';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

const { Step } = Steps;

class CreateDataSource extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSourceTypes: [], selectedType: null };
    DataSource.types(dataSourceTypes => this.setState({ dataSourceTypes }));
  }

  renderTypes() {
    const { dataSourceTypes } = this.state;
    const types = dataSourceTypes.map(dataSourceType => ({
      name: dataSourceType.name,
      type: dataSourceType.type,
      imgSrc: `${DataSource.IMG_ROOT}/${dataSourceType.type}.png`,
      onClick: () => this.setState({ selectedType: dataSourceType.type }),
    }));

    return (<TypePicker types={types} />);
  }

  renderForm() {
    const { dataSourceTypes, selectedType } = this.state;
    const type = find(dataSourceTypes, { type: selectedType });
    const dataSource = new DataSource({ options: {} });
    const fields = helper.getFields(type.configuration_schema, dataSource);

    return (
      <div>
        <div className="text-center">
          <img src={`${DataSource.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
          <h3>{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4">
          <DynamicForm fields={fields} feedbackIcons />
        </div>
      </div>
    );
  }

  render() {
    const { selectedType } = this.state;
    const currentStep = selectedType ? 1 : 0;

    return (
      <div className="row">
        <h3 className="text-center">New Data Source</h3>
        <Steps className="p-20" current={currentStep}>
          <Step
            title="Select the Type"
            style={currentStep > 0 ? { cursor: 'pointer' } : null}
            onClick={() => this.setState({ selectedType: null })}
          />
          <Step title="Configure it" />
          <Step title="Done" />
        </Steps>
        {selectedType ? this.renderForm() : this.renderTypes()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageCreateDataSource', react2angular(CreateDataSource));

  return {
    '/data_sources/new': {
      template: '<settings-screen><page-create-data-source></page-data-source></settings-screen>',
      title: 'Data Sources',
    },
  };
}

init.init = true;
