import React from "react";

import HelpTrigger from "@/components/HelpTrigger";
import DynamicComponent from "@/components/DynamicComponent";
import { Alert as AlertType } from "@/components/proptypes";

import Form from "antd/lib/form";
import Button from "antd/lib/button";

import Title from "./components/Title";
import Criteria from "./components/Criteria";
import NotificationTemplate from "./components/NotificationTemplate";
import Rearm from "./components/Rearm";
import Query from "./components/Query";

import HorizontalFormItem from "./components/HorizontalFormItem";

type OwnProps = {
    alert: AlertType;
    queryResult?: any;
    pendingRearm?: number;
    menuButton: React.ReactNode;
    save: (...args: any[]) => any;
    cancel: (...args: any[]) => any;
    onQuerySelected: (...args: any[]) => any;
    onNameChange: (...args: any[]) => any;
    onCriteriaChange: (...args: any[]) => any;
    onRearmChange: (...args: any[]) => any;
    onNotificationTemplateChange: (...args: any[]) => any;
};

type State = any;

type Props = OwnProps & typeof AlertEdit.defaultProps;

export default class AlertEdit extends React.Component<Props, State> {

static defaultProps = {
    queryResult: null,
    pendingRearm: null,
};

  _isMounted = false;

  state = {
    saving: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  save = () => {
    this.setState({ saving: true });
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'save' does not exist on type 'never'.
    this.props.save().catch(() => {
      if (this._isMounted) {
        this.setState({ saving: false });
      }
    });
  };

  cancel = () => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'cancel' does not exist on type 'never'.
    this.props.cancel();
  };

  render() {
    const { alert, queryResult, pendingRearm, onNotificationTemplateChange, menuButton } = this.props;
    const { onQuerySelected, onNameChange, onRearmChange, onCriteriaChange } = this.props;
    const { query, name, options } = alert;
    const { saving } = this.state;

    return (
      <>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Title name={name} alert={alert} onChange={onNameChange} editMode>
          {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
          <DynamicComponent name="AlertEdit.HeaderExtra" alert={alert} />
          <Button className="m-r-5" onClick={() => this.cancel()}>
            <i className="fa fa-times m-r-5" />
            Cancel
          </Button>
          <Button type="primary" onClick={() => this.save()}>
            {saving ? <i className="fa fa-spinner fa-pulse m-r-5" /> : <i className="fa fa-check m-r-5" />}
            Save Changes
          </Button>
          {menuButton}
        </Title>
        <div className="bg-white tiled p-20">
          <div className="d-flex">
            <Form className="flex-fill">
              {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <HorizontalFormItem label="Query">
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
                <Query query={query} queryResult={queryResult} onChange={onQuerySelected} editMode />
              </HorizontalFormItem>
              {queryResult && options && (
                <>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="Trigger when" className="alert-criteria">
                    <Criteria
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'getColumnNames' does not exist on type '... Remove this comment to see the full error message
                      columnNames={queryResult.getColumnNames()}
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'getData' does not exist on type 'never'.
                      resultValues={queryResult.getData()}
                      alertOptions={options}
                      onChange={onCriteriaChange}
                      editMode
                    />
                  </HorizontalFormItem>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="When triggered, send notification">
                    {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
                    <Rearm value={pendingRearm || 0} onChange={onRearmChange} editMode />
                  </HorizontalFormItem>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="Template">
                    <NotificationTemplate
                      alert={alert}
                      query={query}
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'getColumnNames' does not exist on type '... Remove this comment to see the full error message
                      columnNames={queryResult.getColumnNames()}
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'getData' does not exist on type 'never'.
                      resultValues={queryResult.getData()}
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'custom_subject' does not exist on type '... Remove this comment to see the full error message
                      subject={options.custom_subject}
                      // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
                      setSubject={subject => onNotificationTemplateChange({ custom_subject: subject })}
                      // @ts-expect-error ts-migrate(2339) FIXME: Property 'custom_body' does not exist on type 'nev... Remove this comment to see the full error message
                      body={options.custom_body}
                      // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
                      setBody={body => onNotificationTemplateChange({ custom_body: body })}
                    />
                  </HorizontalFormItem>
                </>
              )}
            </Form>
            <div>
              {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
              <HelpTrigger className="f-13" type="ALERT_SETUP">
                Setup Instructions <i className="fa fa-question-circle" />
              </HelpTrigger>
            </div>
          </div>
        </div>
      </>
    );
  }
}
