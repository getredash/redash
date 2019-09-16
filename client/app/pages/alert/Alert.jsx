import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { head, includes, template as templateBuilder } from 'lodash';
import cx from 'classnames';

import { $route } from '@/services/ng';
import { currentUser } from '@/services/auth';
import { Query as QueryService } from '@/services/query';
import navigateTo from '@/services/navigateTo';
import notification from '@/services/notification';
import { Alert as AlertService } from '@/services/alert';

import { QuerySelector } from '@/components/QuerySelector';
import { HelpTrigger } from '@/components/HelpTrigger';
import { PageHeader } from '@/components/PageHeader';
import LoadingState from '@/components/items-list/components/LoadingState';
import { TimeAgo } from '@/components/TimeAgo';

import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';

import Criteria from './components/Criteria';
import NotificationTemplate from './components/NotificationTemplate';
import Rearm from './components/Rearm';
import Query from './components/Query';
import AlertDestinations from './components/AlertDestinations';

import { routesToAngularRoutes } from '@/lib/utils';

import { STATE_CLASS } from '../alerts/AlertsList';


const NEW_ALERT_ID = 'new';

const defaultNameBuilder = templateBuilder('<%= query.name %>: <%= options.column %> <%= options.op %> <%= options.value %>');

function isNewAlert() {
  return $route.current.params.alertId === NEW_ALERT_ID;
}

function HorizontalFormItem({ children, label, className, ...props }) {
  const labelCol = { span: 4 };
  const wrapperCol = { span: 16 };
  if (!label) {
    wrapperCol.offset = 4;
  }

  className = cx('alert-form-item', className);

  return (
    <Form.Item labelCol={labelCol} wrapperCol={wrapperCol} label={label} className={className} {...props}>
      { children }
    </Form.Item>
  );
}

HorizontalFormItem.propTypes = {
  children: PropTypes.node,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  className: PropTypes.string,
};

HorizontalFormItem.defaultProps = {
  children: null,
  label: null,
  className: null,
};

function AlertState({ state, lastTriggered }) {
  return (
    <div className="alert-state">
      <span className={`alert-state-indicator label ${STATE_CLASS[state]}`}>Status: {state}</span>
      {state === 'unknown' && (
        <div className="ant-form-explain">
          Alert condition has not been evaluated.
        </div>
      )}
      {lastTriggered && (
        <div className="ant-form-explain">
          Last triggered <span className="alert-last-triggered"><TimeAgo date={lastTriggered} /></span>
        </div>
      )}
    </div>
  );
}

AlertState.propTypes = {
  state: PropTypes.string.isRequired,
  lastTriggered: PropTypes.string,
};

AlertState.defaultProps = {
  lastTriggered: null,
};

function SetupInstructions() {
  return (
    <HelpTrigger className="alert-setup-instructions" type="ALERT_SETUP">
      Setup Instructions <i className="fa fa-question-circle" />
    </HelpTrigger>
  );
}

class AlertPage extends React.Component {
  state = {
    alert: null,
    queryResult: null,
    pendingRearm: null,
    editMode: false,
  }

  componentDidMount() {
    if (isNewAlert()) {
      this.setState({
        alert: new AlertService({
          options: {
            op: 'greater than',
            value: 1,
            rearm: 0,
          },
          pendingRearm: 0,
        }),
        editMode: true,
      });
    } else {
      const { alertId } = $route.current.params;
      const { editMode } = $route.current.locals;
      AlertService.get({ id: alertId }).$promise.then((alert) => {
        this.setState({
          alert,
          pendingRearm: alert.rearm,
          editMode: editMode && currentUser.canEdit(alert),
        });
        this.onQuerySelected(alert.query);
      });
    }
  }

  getDefaultName = () => {
    const { alert } = this.state;
    if (!alert.query) {
      return undefined;
    }
    return defaultNameBuilder(alert);
  }

  onQuerySelected = (query) => {
    this.setState(({ alert }) => ({
      alert: Object.assign(alert, { query }),
      queryResult: null,
    }));

    if (query) {
      // get cached result for column names and values
      new QueryService(query).getQueryResultPromise().then((queryResult) => {
        this.setState({ queryResult });
        let { column } = this.state.alert.options;
        const columns = queryResult.getColumnNames();

        // default to first column name if none chosen, or irrelevant in current query
        if (!column || !includes(columns, column)) {
          column = head(queryResult.getColumnNames());
        }
        this.setAlertOptions({ column });
      });
    }
  }

  onRearmChange = (pendingRearm) => {
    this.setState({ pendingRearm });
  }

  onTemplateSubjectChange = (event) => {
    this.setAlertOptions({ subject: event.target.value });
  }

  onTemplateBodyChange = (event) => {
    this.setAlertOptions({ template: event.target.value });
  }

  setAlertOptions = (obj) => {
    const { alert } = this.state;
    const options = { ...alert.options, ...obj };
    this.setState({
      alert: Object.assign(alert, { options }),
    });
  }

  setName = (name) => {
    const { alert } = this.state;
    this.setState({
      alert: Object.assign(alert, { name }),
    });
  }

  save = () => {
    const { alert, pendingRearm } = this.state;

    if (alert.name === undefined || alert.name === '') {
      alert.name = this.getDefaultName();
    }

    alert.rearm = pendingRearm || null;

    alert.$save().then(() => {
      if (isNewAlert()) {
        notification.success('Saved new Alert.');
        navigateTo(`/alerts/${alert.id}`, true);
      } else {
        this.setState({ alert });
        notification.success('Saved.');
      }
    }).catch(() => {
      notification.error('Failed saving alert.');
    });
  };

  delete = () => {
    const { alert } = this.state;

    const doDelete = () => {
      alert.$delete(() => {
        notification.success('Alert deleted successfully.');
        navigateTo('/alerts', true);
      }, () => {
        notification.error('Failed deleting alert.');
      });
    };

    Modal.confirm({
      title: 'Delete Alert',
      content: 'Are you sure you want to delete this alert?',
      okText: 'Delete',
      okType: 'danger',
      onOk: doDelete,
      maskClosable: true,
      autoFocusButton: null,
    });
  }

  render() {
    const { alert, pendingRearm } = this.state;
    if (!alert) {
      return (
        <div className="container alert-page new-alert">
          <LoadingState className="m-t-30" />;
        </div>
      );
    }

    const { query, name, options } = alert;
    if (query === undefined) { // as opposed to `null` which means query was previously set
      return (
        <div className="container alert-page new-alert">
          <PageHeader title={this.getDefaultName()} />
          <SetupInstructions />
          <div className="row bg-white tiled p-20">
            <div className="m-b-30">
              Start by selecting the query that you would like to monitor using the search bar.
              <br />
              Keep in mind that Alerts do not work with queries that use parameters.
            </div>
            <QuerySelector
              onChange={this.onQuerySelected}
              selectedQuery={query}
              className="alert-query-selector"
              type="select"
            />
          </div>
        </div>
      );
    }

    const { queryResult, editMode } = this.state;
    const title = name || this.getDefaultName();

    return (
      <div className="container alert-page">
        <div className="p-b-10 m-l-0 m-r-0 page-header--new">
          <div className="page-title p-0">
            <h3>
              {editMode ? <Input value={title} onChange={e => this.setName(e.target.value)} /> : title }
            </h3>
          </div>
        </div>
        {editMode && <SetupInstructions />}
        <div className="row bg-white tiled p-10 p-t-20">
          <div className="col-md-8">
            <Form>
              {!editMode && (
                <HorizontalFormItem>
                  <AlertState state={alert.state} lastTriggered={alert.last_triggered_at} />
                </HorizontalFormItem>
              )}
              <HorizontalFormItem label="Query">
                <Query query={query} onChange={this.onQuerySelected} editMode={editMode} />
              </HorizontalFormItem>
              {query && !queryResult && (
                <HorizontalFormItem className="m-t-30">
                  <Icon type="loading" className="m-r-5" /> Loading query data
                </HorizontalFormItem>
              )}
              {queryResult && options && (
                <>
                  <HorizontalFormItem label="Trigger when" className="alert-criteria">
                    <Criteria
                      columnNames={queryResult.getColumnNames()}
                      resultValues={queryResult.getData()}
                      alertOptions={options}
                      onChange={this.setAlertOptions}
                      editMode={editMode}
                    />
                  </HorizontalFormItem>
                  {editMode ? (
                    <>
                      <HorizontalFormItem label="When triggered, send notification">
                        <Rearm value={pendingRearm} onChange={this.onRearmChange} editMode />
                      </HorizontalFormItem>
                      <HorizontalFormItem label="Template">
                        <NotificationTemplate
                          alert={alert}
                          query={query}
                          columnNames={queryResult.getColumnNames()}
                          resultValues={queryResult.getData()}
                          subject={options.subject}
                          setSubject={subject => this.setAlertOptions({ subject })}
                          body={options.template}
                          setBody={template => this.setAlertOptions({ template })}
                          editMode
                        />
                      </HorizontalFormItem>
                    </>
                  ) : (
                    <HorizontalFormItem label="Notifications" className="form-item-line-height-normal">
                      <Rearm value={pendingRearm} onChange={this.onRearmChange} />
                      <br />
                      Set to {options.subject || options.template ? 'custom' : 'default'} notification template.
                    </HorizontalFormItem>
                  )}
                  {isNewAlert() && (
                    <HorizontalFormItem>
                      <Button type="primary" onClick={this.save}>Save</Button>
                    </HorizontalFormItem>
                  )}
                </>
              )}
            </Form>
          </div>
          {alert.id && (
            <div className="col-md-4">
              <h4>Destinations{' '}
                <Tooltip title="Open Alert Destinations page in a new tab.">
                  <a href="/destinations" target="_blank">
                    <i className="fa fa-external-link" />
                  </a>
                </Tooltip>
              </h4>
              <AlertDestinations alertId={alert.id} />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('alertPage', react2angular(AlertPage));

  return routesToAngularRoutes([
    {
      path: '/alerts/:alertId',
      title: 'Alert',
      editMode: false,
    }, {
      path: '/alerts/:alertId/edit',
      title: 'Alert',
      editMode: true,
    },
  ], {
    template: '<alert-page></alert-page>',
  });
}

init.init = true;
