import React from "react";
import cx from "classnames";
import Link from "@/components/Link";
import TimeAgo from "@/components/TimeAgo";
import { Alert as AlertType } from "@/components/proptypes";
import Form from "antd/lib/form";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import AntAlert from "antd/lib/alert";
import * as Grid from "antd/lib/grid";
import Title from "./components/Title";
import Criteria from "./components/Criteria";
import Rearm from "./components/Rearm";
import Query from "./components/Query";
import AlertDestinations from "./components/AlertDestinations";
import HorizontalFormItem from "./components/HorizontalFormItem";
import { STATE_CLASS } from "../alerts/AlertsList";
import DynamicComponent from "@/components/DynamicComponent";
type OwnAlertStateProps = {
    state: string;
    lastTriggered?: string;
};
type AlertStateProps = OwnAlertStateProps & typeof AlertState.defaultProps;
function AlertState({ state, lastTriggered }: AlertStateProps) {
    return (<div className="alert-state">
      <span className={`alert-state-indicator label ${STATE_CLASS[state]}`}>Status: {state}</span>
      {state === "unknown" && <div className="ant-form-item-explain">Alert condition has not been evaluated.</div>}
      {lastTriggered && (<div className="ant-form-item-explain">
          Last triggered{" "}
          <span className="alert-last-triggered">
            <TimeAgo date={lastTriggered}/>
          </span>
        </div>)}
    </div>);
}
AlertState.defaultProps = {
    lastTriggered: null,
};
type OwnAlertViewProps = {
    alert: AlertType;
    queryResult?: any;
    canEdit: boolean;
    onEdit: (...args: any[]) => any;
    menuButton: React.ReactNode;
    unmute?: (...args: any[]) => any;
};
type AlertViewState = any;
type AlertViewProps = OwnAlertViewProps & typeof AlertView.defaultProps;
// eslint-disable-next-line react/prefer-stateless-function
export default class AlertView extends React.Component<AlertViewProps, AlertViewState> {
    static defaultProps = {
        queryResult: null,
        unmute: null,
    };
    state = {
        unmuting: false,
    };
    unmute = () => {
        this.setState({ unmuting: true });
        (this.props as any).unmute().finally(() => {
            this.setState({ unmuting: false });
        });
    };
    render() {
        const { alert, queryResult, canEdit, onEdit, menuButton } = this.props;
        const { query, name, options, rearm } = alert;
        return (<>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Title name={name} alert={alert}>
          {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
          <DynamicComponent name="AlertView.HeaderExtra" alert={alert}/>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Tooltip title={canEdit ? "" : "You do not have sufficient permissions to edit this alert"}>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type '((event: Mo... Remove this comment to see the full error message */}
            <Button type="default" onClick={canEdit ? onEdit : null} className={cx({ disabled: !canEdit })}>
              <i className="fa fa-edit m-r-5"/>
              Edit
            </Button>
            {menuButton}
          </Tooltip>
        </Title>
        <div className="bg-white tiled p-20">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; type: string; gutter:... Remove this comment to see the full error message */}
          <Grid.Row type="flex" gutter={16}>
            <Grid.Col xs={24} md={16} className="d-flex">
              <Form className="flex-fill">
                {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <HorizontalFormItem>
                  {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'. */}
                  <AlertState state={(alert as any).state} lastTriggered={(alert as any).last_triggered_at}/>
                </HorizontalFormItem>
                {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <HorizontalFormItem label="Query">
                  {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ query: never; queryResult: never; }' is no... Remove this comment to see the full error message */}
                  <Query query={query} queryResult={queryResult}/>
                </HorizontalFormItem>
                {queryResult && options && (<>
                    {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                    <HorizontalFormItem label="Trigger when" className="alert-criteria">
                      <Criteria columnNames={(queryResult as any).getColumnNames()} resultValues={(queryResult as any).getData()} alertOptions={options}/>
                    </HorizontalFormItem>
                    {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
                    <HorizontalFormItem label="Notifications" className="form-item-line-height-normal">
                      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ value: never; }' is not assignable to type... Remove this comment to see the full error message */}
                      <Rearm value={rearm || 0}/>
                      <br />
                      Set to {(options as any).custom_subject || (options as any).custom_body ? "custom" : "default"} notification
                      template.
                    </HorizontalFormItem>
                  </>)}
              </Form>
            </Grid.Col>
            <Grid.Col xs={24} md={8}>
              {(options as any).muted && (<AntAlert className="m-b-20" message={<>
                      <i className="fa fa-bell-slash-o"/> Notifications are muted
                    </>} description={<>
                      Notifications for this alert will not be sent.
                      <br />
                      {canEdit && (<>
                          To restore notifications click
                          <Button size="small" type="primary" onClick={this.unmute} loading={this.state.unmuting} className="m-t-5 m-l-5">
                            Unmute
                          </Button>
                        </>)}
                    </>} type="warning"/>)}
              <h4>
                Destinations{" "}
                <Tooltip title="Open Alert Destinations page in a new tab.">
                  <Link href="destinations" target="_blank">
                    <i className="fa fa-external-link f-13"/>
                  </Link>
                </Tooltip>
              </h4>
              <AlertDestinations alertId={(alert as any).id}/>
            </Grid.Col>
          </Grid.Row>
        </div>
      </>);
    }
}
