import React from "react";
import HelpTrigger from "@/components/HelpTrigger";
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
    onQuerySelected: (...args: any[]) => any;
    save: (...args: any[]) => any;
    onNameChange: (...args: any[]) => any;
    onRearmChange: (...args: any[]) => any;
    onCriteriaChange: (...args: any[]) => any;
    onNotificationTemplateChange: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof AlertNew.defaultProps;
export default class AlertNew extends React.Component<Props, State> {
    static defaultProps = {
        queryResult: null,
        pendingRearm: null,
    };
    state = {
        saving: false,
    };
    save = () => {
        this.setState({ saving: true });
        (this.props as any).save().catch(() => {
            this.setState({ saving: false });
        });
    };
    render() {
        const { alert, queryResult, pendingRearm, onNotificationTemplateChange } = this.props;
        const { onQuerySelected, onNameChange, onRearmChange, onCriteriaChange } = this.props;
        const { query, name, options } = alert;
        const { saving } = this.state;
        return (<>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
        <Title alert={alert} name={name} onChange={onNameChange} editMode/>
        <div className="bg-white tiled p-20">
          <div className="d-flex">
            <Form className="flex-fill">
              <div className="m-b-30">
                Start by selecting the query that you would like to monitor using the search bar.
                <br />
                Keep in mind that Alerts do not work with queries that use parameters.
              </div>
              {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <HorizontalFormItem label="Query">
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
                <Query query={query} queryResult={queryResult} onChange={onQuerySelected} editMode/>
              </HorizontalFormItem>
              {queryResult && options && (<>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="Trigger when" className="alert-criteria">
                    <Criteria columnNames={(queryResult as any).getColumnNames()} resultValues={(queryResult as any).getData()} alertOptions={options} onChange={onCriteriaChange} editMode/>
                  </HorizontalFormItem>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="When triggered, send notification">
                    {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
                    <Rearm value={pendingRearm || 0} onChange={onRearmChange} editMode/>
                  </HorizontalFormItem>
                  {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <HorizontalFormItem label="Template">
                    {/* @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable. */}
                    <NotificationTemplate alert={alert} query={query} columnNames={(queryResult as any).getColumnNames()} resultValues={(queryResult as any).getData()} subject={(options as any).custom_subject} setSubject={subject => onNotificationTemplateChange({ custom_subject: subject })} body={(options as any).custom_body} setBody={body => onNotificationTemplateChange({ custom_body: body })}/>
                  </HorizontalFormItem>
                </>)}
              {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <HorizontalFormItem>
                <Button type="primary" onClick={this.save} disabled={!query} className="btn-create-alert">
                  {saving && <i className="fa fa-spinner fa-pulse m-r-5"/>}
                  Create Alert
                </Button>
              </HorizontalFormItem>
            </Form>
            {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
            <HelpTrigger className="f-13" type="ALERT_SETUP">
              Setup Instructions <i className="fa fa-question-circle"/>
            </HelpTrigger>
          </div>
        </div>
      </>);
    }
}
