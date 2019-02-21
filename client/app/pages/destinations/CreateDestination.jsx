import React from 'react';
import Steps from 'antd/lib/steps';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { Destination } from '@/services/destination';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/TypePicker';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

const { Step } = Steps;

const StepEnum = {
  SELECT_TYPE: 0,
  CONFIGURE_IT: 1,
  DONE: 2,
};

class CreateDestination extends React.Component {
  constructor(props) {
    super(props);
    this.state = { destinationTypes: [], selectedType: null, currentStep: StepEnum.SELECT_TYPE };
    Destination.types(destinationTypes => this.setState({ destinationTypes }));
    this.topRef = React.createRef();
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
    const { destinationTypes } = this.state;
    const types = destinationTypes.map(destinationType => ({
      name: destinationType.name,
      type: destinationType.type,
      imgSrc: `${Destination.IMG_ROOT}/${destinationType.type}.png`,
      onClick: () => this.selectType(destinationType.type),
    }));

    return (<TypePicker types={types} />);
  }

  renderForm() {
    const { destinationTypes, selectedType } = this.state;
    const type = find(destinationTypes, { type: selectedType });
    const destination = new Destination({ options: {}, type: selectedType });
    const fields = helper.getFields(type.configuration_schema, destination);

    const onSubmit = (values, onSuccess, onError) => {
      helper.updateTargetWithValues(destination, values);
      destination.$save(
        (data) => {
          onSuccess('Saved.');
          this.setState({ currentStep: StepEnum.DONE }, () => navigateTo(`destinations/${data.id}`));
          this.scrollToTop();
        },
        (error) => {
          if (error.status === 400 && 'message' in error.data) {
            onError(error.data.message);
          } else {
            onError('Failed saving.');
          }
        },
      );
    };

    return (
      <div>
        <div className="col-sm-offset-4 col-sm-4 text-center">
          <img src={`${Destination.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
          <h3>{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4">
          <DynamicForm fields={fields} onSubmit={onSubmit} feedbackIcons />
        </div>
      </div>
    );
  }

  render() {
    const { currentStep } = this.state;

    return (
      <div className="row" ref={this.topRef}>
        <h3 className="text-center">New Alert Destination</h3>
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
  ngModule.component('pageCreateDestination', react2angular(CreateDestination));

  return {
    '/destinations/new': {
      template: '<settings-screen><page-create-destination></page-create-destination></settings-screen>',
      title: 'Destinations',
    },
  };
}

init.init = true;
