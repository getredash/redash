import React from 'react';
import Steps from 'antd/lib/steps';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { DataSource } from '@/services/data-source';
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

const HELP_LINKS = {
  athena: 'https://redash.io/help/data-sources/amazon-athena-setup',
  bigquery: 'https://redash.io/help/data-sources/bigquery-setup',
  url: 'https://redash.io/help/data-sources/querying-urls',
  mongodb: 'https://redash.io/help/data-sources/mongodb-setup',
  google_spreadsheets: 'https://redash.io/help/data-sources/querying-a-google-spreadsheet',
  google_analytics: 'https://redash.io/help/data-sources/google-analytics-setup',
  axibasetsd: 'https://redash.io/help/data-sources/axibase-time-series-database',
  results: 'https://redash.io/help/user-guide/querying/query-results-data-source',
};

class CreateDataSource extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dataSourceTypes: [], selectedType: null, currentStep: StepEnum.SELECT_TYPE };
    DataSource.types(dataSourceTypes => this.setState({ dataSourceTypes }));
    this.topRef = React.createRef();
  }

  scrollToTop = () => {
    window.scrollTo({ top: this.topRef.current.offsetTop, behavior: 'smooth' });
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
    const type = find(dataSourceTypes, { type: selectedType });
    const dataSource = new DataSource({ options: {}, type: selectedType });
    const fields = helper.getFields(type.configuration_schema, dataSource);

    const onSubmit = (values, onSuccess, onError) => {
      helper.updateTargetWithValues(dataSource, values);
      dataSource.$save(
        (data) => {
          this.setState({ currentStep: StepEnum.DONE }, () => navigateTo(`data_sources/${data.id}`));
          onSuccess('Saved.');
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
          <img src={`${DataSource.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
          <h3>{type.name}</h3>
        </div>
        <div className="col-sm-4">
          {HELP_LINKS[selectedType] && (
            <p className="needhelp text-right text-center-xs">
              {/* eslint-disable-next-line react/jsx-no-target-blank */}
              <a href={HELP_LINKS[selectedType]} target="_blank" rel="noopener">
                Help <span className="hidden-xs">setting up {type.name}</span> <i className="fa fa-external-link" aria-hidden="true" />
              </a>
            </p>
          )}
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
      template: '<settings-screen><page-create-data-source></page-data-source></settings-screen>',
      title: 'Data Sources',
    },
  };
}

init.init = true;
