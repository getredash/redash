import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, includes, find } from 'lodash';
import Button from 'antd/lib/button';
import List from 'antd/lib/list';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Steps from 'antd/lib/steps';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { PreviewCard } from '@/components/PreviewCard';
import EmptyState from '@/components/items-list/components/EmptyState';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

const { Step } = Steps;
const { Search } = Input;

const StepEnum = {
  SELECT_TYPE: 0,
  CONFIGURE_IT: 1,
  DONE: 2,
};

class CreateSourceDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    types: PropTypes.arrayOf(PropTypes.object),
    sourceType: PropTypes.string.isRequired,
    imageFolder: PropTypes.string.isRequired,
    helpLinks: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onCreate: PropTypes.func.isRequired,
  };

  static defaultProps = {
    types: [],
    helpLinks: {},
  };

  constructor(props) {
    super(props);
    this.state = {
      searchText: '',
      selectedType: null,
      savingSource: false,
      currentStep: StepEnum.SELECT_TYPE,
    };
  }

  selectType = (selectedType) => {
    this.setState({ selectedType, currentStep: StepEnum.CONFIGURE_IT });
  };

  resetType = () => {
    if (this.state.currentStep === StepEnum.CONFIGURE_IT) {
      this.setState({ searchText: '', selectedType: null, currentStep: StepEnum.SELECT_TYPE });
    }
  };

  createSource = (values, successCallback, errorCallback) => {
    const { selectedType, savingSource } = this.state;
    if (!savingSource) {
      this.setState({ savingSource: true, currentStep: StepEnum.DONE });
      this.props.onCreate(selectedType, values).then(() => {
        successCallback('Saved.');
        this.props.dialog.close();
      }).catch((error) => {
        this.setState({ savingSource: false, currentStep: StepEnum.CONFIGURE_IT });
        errorCallback(error.message);
      });
    }
  };

  renderTypeSelector() {
    const { types } = this.props;
    const { searchText } = this.state;
    const filteredTypes = types.filter(type => isEmpty(searchText) ||
      includes(type.name.toLowerCase(), searchText.toLowerCase()));
    return (
      <div className="m-t-20">
        <Search
          placeholder="Search..."
          onChange={e => this.setState({ searchText: e.target.value })}
          autoFocus
        />
        <div className="scrollbox p-5 m-t-10" style={{ minHeight: '30vh', maxHeight: '40vh' }}>
          {isEmpty(filteredTypes) ? (<EmptyState className="" />) : (
            <List
              size="small"
              dataSource={filteredTypes}
              renderItem={item => this.renderItem(item)}
            />
          )}
        </div>
      </div>
    );
  }

  renderForm() {
    const { types, imageFolder, helpLinks } = this.props;
    const { selectedType } = this.state;
    const type = find(types, { type: selectedType });
    const fields = helper.getFields(type.configuration_schema);
    return (
      <div className="scrollbox p-5 m-t-10" style={{ maxHeight: '50vh' }}>
        <div className="text-center">
          <img src={`${imageFolder}/${selectedType}.png`} alt={type.name} width="48" />
          <h4 className="di-block">{type.name}</h4>
          {helpLinks[selectedType] && (
          <p className="text-center">
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            <a href={helpLinks[selectedType]} target="_blank" rel="noopener">
              Help setting up {type.name} <i className="fa fa-external-link" aria-hidden="true" />
            </a>
          </p>
          )}
        </div>
        <DynamicForm
          id="sourceForm"
          fields={fields}
          onSubmit={this.createSource}
          feedbackIcons
          hideSubmitButton
        />
      </div>
    );
  }

  renderItem(item) {
    const { imageFolder } = this.props;
    return (
      <List.Item
        className="p-l-10 p-r-10 clickable"
        onClick={() => this.selectType(item.type)}
      >
        <PreviewCard title={item.name} imageUrl={`${imageFolder}/${item.type}.png`}>
          <i className="fa fa-angle-double-right" />
        </PreviewCard>
      </List.Item>
    );
  }

  render() {
    const { currentStep, savingSource } = this.state;
    const { dialog, sourceType } = this.props;
    return (
      <Modal
        {...dialog.props}
        title={`Create a New ${sourceType}`}
        footer={(currentStep === StepEnum.SELECT_TYPE) ? [
          (<Button key="cancel" onClick={() => dialog.dismiss()}>Cancel</Button>),
          (<Button key="submit" type="primary" disabled>Create</Button>),
        ] : [
          (<Button key="previous" onClick={this.resetType}>Previous</Button>),
          (
            <Button key="submit" htmlType="submit" form="sourceForm" type="primary" loading={savingSource}>
              Create
            </Button>
          ),
        ]}
      >
        <Steps className="hidden-xs" size="small" current={currentStep} progressDot>
          {currentStep === StepEnum.CONFIGURE_IT ? (
            <Step
              title={<a>Select the Type</a>}
              className="clickable"
              onClick={this.resetType}
            />
          ) : (<Step title="Select the Type" />)}
          <Step title="Configure it" />
          <Step title="Done" />
        </Steps>
        {currentStep === StepEnum.SELECT_TYPE && this.renderTypeSelector()}
        {currentStep !== StepEnum.SELECT_TYPE && this.renderForm()}
      </Modal>
    );
  }
}

export default wrapDialog(CreateSourceDialog);
