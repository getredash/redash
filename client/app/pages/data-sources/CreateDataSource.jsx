import React from 'react';
import Steps from 'antd/lib/steps';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { DataSource } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/TypePicker';
import EditDataSourceForm from '@/components/data-sources/EditDataSourceForm';

const { Step } = Steps;

const StepEnum = {
  SELECT_TYPE: 0,
  CONFIGURE_IT: 1,
  DONE: 2,
};

class CreateDataSource extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSourceTypes: [], selectedType: null, currentStep: StepEnum.SELECT_TYPE };
    this.topRef = React.createRef();
  }

  componentDidMount() {
    DataSource.types(dataSourceTypes => this.setState({ dataSourceTypes }));
  }

  scrollToTop = () => {
    window.scrollTo(0, this.topRef.current.offsetTop);
  }

  selectType = (selectedType) => {
    this.setState({ selectedType, currentStep: StepEnum.CONFIGURE_IT });
    this.scrollToTop();
  };

  resetType = () => {
    if (this.state.currentStep === StepEnum.CONFIGURE_IT) {
      this.setState({ selectedType: null, currentStep: StepEnum.SELECT_TYPE });
      this.scrollToTop();
    }
  };

  renderTypes() {
    const { dataSourceTypes } = this.state;
    const types = dataSourceTypes.map(dataSourceType => ({
      name: dataSourceType.name,
      type: dataSourceType.type,
      imgSrc: `${DataSource.IMG_ROOT}/${dataSourceType.type}.png`,
      onClick: () => this.selectType(dataSourceType.type),
    }));

    return (<TypePicker types={types} />);
  }

  renderForm() {
    const { dataSourceTypes, selectedType } = this.state;
    const formProps = {
      dataSource: new DataSource({ options: {}, type: selectedType }),
      type: find(dataSourceTypes, { type: selectedType }),
      onSuccess: (data) => {
        this.setState({ currentStep: StepEnum.DONE }, () => navigateTo(`data_sources/${data.id}`));
        this.scrollToTop();
      },
    };

    return (
      <EditDataSourceForm {...formProps} />
    );
  }

  render() {
    const { currentStep } = this.state;

    return (
      <div className="row" ref={this.topRef}>
        <h3 className="text-center">New Data Source</h3>
        <Steps className="p-20" current={currentStep}>
          <Step
            title="Select the Type"
            style={currentStep === StepEnum.CONFIGURE_IT ? { cursor: 'pointer' } : {}}
            onClick={this.resetType}
          />
          <Step title="Configure it" />
          <Step title="Done" />
        </Steps>
        {currentStep === StepEnum.SELECT_TYPE && this.renderTypes()}
        {currentStep === StepEnum.CONFIGURE_IT && this.renderForm()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageCreateDataSource', react2angular(CreateDataSource));

  return {
    '/data_sources/new': {
      template: '<settings-screen><page-create-data-source></page-create-data-source></settings-screen>',
      title: 'Data Sources',
    },
  };
}

init.init = true;
