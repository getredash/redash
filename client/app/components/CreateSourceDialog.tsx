import React from "react";
import { isEmpty, toUpper, includes, get } from "lodash";
import Button from "antd/lib/button";
import List from "antd/lib/list";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Steps from "antd/lib/steps";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import Link from "@/components/Link";
import { PreviewCard } from "@/components/PreviewCard";
import EmptyState from "@/components/items-list/components/EmptyState";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import HelpTrigger, { TYPES as HELP_TRIGGER_TYPES } from "@/components/HelpTrigger";
const { Step } = Steps;
const { Search } = Input;
const StepEnum = {
    SELECT_TYPE: 0,
    CONFIGURE_IT: 1,
    DONE: 2,
};
type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    types?: any[];
    sourceType: string;
    imageFolder: string;
    helpTriggerPrefix?: string;
    onCreate: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof CreateSourceDialog.defaultProps;
class CreateSourceDialog extends React.Component<Props, State> {
    static defaultProps = {
        types: [],
        helpTriggerPrefix: null,
    };
    state = {
        searchText: "",
        selectedType: null,
        savingSource: false,
        currentStep: StepEnum.SELECT_TYPE,
    };
    selectType = (selectedType: any) => {
        this.setState({ selectedType, currentStep: StepEnum.CONFIGURE_IT });
    };
    resetType = () => {
        if (this.state.currentStep === StepEnum.CONFIGURE_IT) {
            this.setState({ searchText: "", selectedType: null, currentStep: StepEnum.SELECT_TYPE });
        }
    };
    createSource = (values: any, successCallback: any, errorCallback: any) => {
        const { selectedType, savingSource } = this.state;
        if (!savingSource) {
            this.setState({ savingSource: true, currentStep: StepEnum.DONE });
            (this.props as any).onCreate(selectedType, values)
                .then((data: any) => {
                successCallback("Saved.");
                (this.props as any).dialog.close({ success: true, data });
            })
                .catch((error: any) => {
                this.setState({ savingSource: false, currentStep: StepEnum.CONFIGURE_IT });
                errorCallback(get(error, "response.data.message", "Failed saving."));
            });
        }
    };
    renderTypeSelector() {
        const { types } = this.props;
        const { searchText } = this.state;
        const filteredTypes = (types as any).filter((type: any) => isEmpty(searchText) || includes(type.name.toLowerCase(), searchText.toLowerCase()));
        return (<div className="m-t-10">
        <Search placeholder="Search..." onChange={e => this.setState({ searchText: e.target.value })} autoFocus data-test="SearchSource"/>
        <div className="scrollbox p-5 m-t-10" style={{ minHeight: "30vh", maxHeight: "40vh" }}>
          {isEmpty(filteredTypes) ? (<EmptyState className=""/>) : (<List size="small" dataSource={filteredTypes} renderItem={item => this.renderItem(item)}/>)}
        </div>
      </div>);
    }
    renderForm() {
        const { imageFolder, helpTriggerPrefix } = this.props;
        const { selectedType } = this.state;
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
        const fields = helper.getFields(selectedType);
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        const helpTriggerType = `${helpTriggerPrefix}${toUpper(selectedType.type)}`;
        return (<div>
        <div className="d-flex justify-content-center align-items-center">
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <img className="p-5" src={`${imageFolder}/${selectedType.type}.png`} alt={selectedType.name} width="48"/>
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <h4 className="m-0">{selectedType.name}</h4>
        </div>
        <div className="text-right">
          {/* @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
          {HELP_TRIGGER_TYPES[helpTriggerType] && (<HelpTrigger className="f-13" type={helpTriggerType}>
              Setup Instructions <i className="fa fa-question-circle"/>
            </HelpTrigger>)}
        </div>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
        <DynamicForm id="sourceForm" fields={fields} onSubmit={this.createSource} feedbackIcons hideSubmitButton/>
        {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
        {selectedType.type === "databricks" && (<small>
            By using the Databricks Data Source you agree to the Databricks JDBC/ODBC{" "}
            <Link href="https://databricks.com/spark/odbc-driver-download" target="_blank" rel="noopener noreferrer">
              Driver Download Terms and Conditions
            </Link>
            .
          </small>)}
      </div>);
    }
    renderItem(item: any) {
        const { imageFolder } = this.props;
        return (<List.Item className="p-l-10 p-r-10 clickable" onClick={() => this.selectType(item)}>
        <PreviewCard title={item.name} imageUrl={`${imageFolder}/${item.type}.png`} roundedImage={false} data-test="PreviewItem" data-test-type={item.type}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <i className="fa fa-angle-double-right"/>
        </PreviewCard>
      </List.Item>);
    }
    render() {
        const { currentStep, savingSource } = this.state;
        const { dialog, sourceType } = this.props;
        return (<Modal {...(dialog as any).props} title={`Create a New ${sourceType}`} footer={currentStep === StepEnum.SELECT_TYPE
            ? [
                <Button key="cancel" onClick={() => (dialog as any).dismiss()} data-test="CreateSourceCancelButton">
                  Cancel
                </Button>,
                <Button key="submit" type="primary" disabled>
                  Create
                </Button>,
            ]
            : [
                <Button key="previous" onClick={this.resetType}>
                  Previous
                </Button>,
                <Button key="submit" htmlType="submit" form="sourceForm" type="primary" loading={savingSource} data-test="CreateSourceSaveButton">
                  Create
                </Button>,
            ]}>
        <div data-test="CreateSourceDialog">
          <Steps className="hidden-xs m-b-10" size="small" current={currentStep} progressDot>
            {currentStep === StepEnum.CONFIGURE_IT ? (<Step title={<a>Type Selection</a>} className="clickable" onClick={this.resetType}/>) : (<Step title="Type Selection"/>)}
            <Step title="Configuration"/>
            <Step title="Done"/>
          </Steps>
          {currentStep === StepEnum.SELECT_TYPE && this.renderTypeSelector()}
          {currentStep !== StepEnum.SELECT_TYPE && this.renderForm()}
        </div>
      </Modal>);
    }
}
export default wrapDialog(CreateSourceDialog);
