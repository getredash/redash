import React from 'react';
import Steps from 'antd/lib/steps';
import { react2angular } from 'react2angular';
import { DataSource } from '@/services/data-source';
import TypePicker from '@/components/TypePicker';

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

  render() {
    const { selectedType } = this.state;
    const currentStep = selectedType ? 1 : 0;

    return (
      <div>
        <h3 className="text-center m-b-20">New Data Source</h3>
        <Steps className="m-b-20" current={currentStep}>
          <Step
            title="Select the Type"
            style={currentStep > 0 ? { cursor: 'pointer' } : null}
            onClick={() => this.setState({ selectedType: null })}
          />
          <Step title="Configure it" />
          <Step title="Done" />
        </Steps>
        {!selectedType && this.renderTypes()}
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
