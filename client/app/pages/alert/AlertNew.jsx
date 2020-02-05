import React from "react";
import PropTypes from "prop-types";

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

export default class AlertNew extends React.Component {
  state = {
    saving: false,
  };

  save = () => {
    this.setState({ saving: true });
    this.props.save().catch(() => {
      this.setState({ saving: false });
    });
  };

  render() {
    const { alert, queryResult, pendingRearm, onNotificationTemplateChange } = this.props;
    const { onQuerySelected, onNameChange, onRearmChange, onCriteriaChange } = this.props;
    const { query, name, options } = alert;
    const { saving } = this.state;

    return (
      <>
        <Title alert={alert} name={name} onChange={onNameChange} editMode />
        <div className="row bg-white tiled p-20">
          <div className="d-flex">
            <Form className="flex-fill">
              <div className="m-b-30">
                Start by selecting the query that you would like to monitor using the search bar.
                <br />
                Keep in mind that Alerts do not work with queries that use parameters.
              </div>
              <HorizontalFormItem label="Query">
                <Query query={query} queryResult={queryResult} onChange={onQuerySelected} editMode />
              </HorizontalFormItem>
              {queryResult && options && (
                <>
                  <HorizontalFormItem label="Trigger when" className="alert-criteria">
                    <Criteria
                      columnNames={queryResult.getColumnNames()}
                      resultValues={queryResult.getData()}
                      alertOptions={options}
                      onChange={onCriteriaChange}
                      editMode
                    />
                  </HorizontalFormItem>
                  <HorizontalFormItem label="When triggered, send notification">
                    <Rearm value={pendingRearm || 0} onChange={onRearmChange} editMode />
                  </HorizontalFormItem>
                  <HorizontalFormItem label="Template">
                    <NotificationTemplate
                      alert={alert}
                      query={query}
                      columnNames={queryResult.getColumnNames()}
                      resultValues={queryResult.getData()}
                      subject={options.custom_subject}
                      setSubject={subject => onNotificationTemplateChange({ custom_subject: subject })}
                      body={options.custom_body}
                      setBody={body => onNotificationTemplateChange({ custom_body: body })}
                    />
                  </HorizontalFormItem>
                </>
              )}
              <HorizontalFormItem>
                <Button type="primary" onClick={this.save} disabled={!query} className="btn-create-alert">
                  {saving && <i className="fa fa-spinner fa-pulse m-r-5" />}
                  Create Alert
                </Button>
              </HorizontalFormItem>
            </Form>
            <HelpTrigger className="f-13" type="ALERT_SETUP">
              Setup Instructions <i className="fa fa-question-circle" />
            </HelpTrigger>
          </div>
        </div>
      </>
    );
  }
}

AlertNew.propTypes = {
  alert: AlertType.isRequired,
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types,
  pendingRearm: PropTypes.number,
  onQuerySelected: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onRearmChange: PropTypes.func.isRequired,
  onCriteriaChange: PropTypes.func.isRequired,
  onNotificationTemplateChange: PropTypes.func.isRequired,
};

AlertNew.defaultProps = {
  queryResult: null,
  pendingRearm: null,
};
