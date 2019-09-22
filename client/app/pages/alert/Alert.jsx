import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { head, includes, template as templateBuilder, trim } from 'lodash';
import cx from 'classnames';

import { $route } from '@/services/ng';
import { currentUser } from '@/services/auth';
import navigateTo from '@/services/navigateTo';
import notification from '@/services/notification';
import { Alert as AlertService } from '@/services/alert';
import { Query as QueryService } from '@/services/query';

import { HelpTrigger } from '@/components/HelpTrigger';
import LoadingState from '@/components/items-list/components/LoadingState';
import { TimeAgo } from '@/components/TimeAgo';

import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';

import Criteria from './components/Criteria';
import NotificationTemplate from './components/NotificationTemplate';
import Rearm from './components/Rearm';
import Query from './components/Query';
import AlertDestinations from './components/AlertDestinations';
import { STATE_CLASS } from '../alerts/AlertsList';
import { routesToAngularRoutes } from '@/lib/utils';


const defaultNameBuilder = templateBuilder('<%= query.name %>: <%= options.column %> <%= options.op %> <%= options.value %>');
const spinnerIcon = <i className="fa fa-spinner fa-pulse m-r-5" />;

function isNewAlert() {
  return $route.current.params.alertId === 'new';
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
  label: PropTypes.string,
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

class AlertPage extends React.Component {
  _isMounted = false;

  state = {
    alert: null,
    queryResult: null,
    pendingRearm: null,
    editMode: false,
    canEdit: false,
    saving: false,
    canceling: false,
  }

  componentDidMount() {
    this._isMounted = true;

    if (isNewAlert()) {
      this.setState({
        alert: new AlertService({
          options: {
            op: 'greater than',
            value: 1,
          },
          pendingRearm: 0,
        }),
        editMode: true,
        canEdit: true,
      });
    } else {
      const { alertId } = $route.current.params;
      const { editMode } = $route.current.locals;
      AlertService.get({ id: alertId }).$promise.then((alert) => {
        const canEdit = currentUser.canEdit(alert);
        if (this._isMounted) {
          this.setState({
            alert,
            pendingRearm: alert.rearm,
            editMode: editMode && canEdit,
            canEdit,
          });
          this.onQuerySelected(alert.query);
        }
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getDefaultName = () => {
    const { alert } = this.state;
    if (!alert.query) {
      return 'New Alert';
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
        if (this._isMounted) {
          this.setState({ queryResult });
          let { column } = this.state.alert.options;
          const columns = queryResult.getColumnNames();

          // default to first column name if none chosen, or irrelevant in current query
          if (!column || !includes(columns, column)) {
            column = head(queryResult.getColumnNames());
          }
          this.setAlertOptions({ column });
        }
      });
    }
  }

  onRearmChange = (pendingRearm) => {
    this.setState({ pendingRearm });
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

  edit = () => {
    const { id } = this.state.alert;
    navigateTo(`/alerts/${id}/edit`, true);
  }

  save = () => {
    const { alert, pendingRearm } = this.state;

    alert.name = trim(alert.name) || this.getDefaultName();
    alert.rearm = pendingRearm || null;

    this.setState({ saving: true, alert });

    alert.$save().then(() => {
      if (isNewAlert()) {
        notification.success('Created new Alert.');
      } else {
        notification.success('Saved.');
      }
      navigateTo(`/alerts/${alert.id}`, true);
    }).catch(() => {
      notification.error('Failed saving alert.');
      if (this._isMounted) {
        this.setState({ saving: false });
      }
    });
  };

  cancel = () => {
    const { alert } = this.state;
    this.setState({ canceling: true });
    navigateTo(`/alerts/${alert.id}`, true);
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
    const { alert } = this.state;
    if (!alert) {
      return <LoadingState className="m-t-30" />;
    }

    const isNew = isNewAlert();
    const { query, name, options } = alert;
    const { queryResult, editMode, pendingRearm, canEdit, saving, canceling } = this.state;

    return (
      <div className="container alert-page">
        <div className="p-b-10 m-l-0 m-r-0 page-header--new">
          <div className="d-flex">
            <h3>
              {editMode && query ? (
                <Input className="f-inherit" placeholder={this.getDefaultName()} value={name} onChange={e => this.setName(e.target.value)} />
              ) : name || this.getDefaultName() }
            </h3>
            <span className="alert-actions">
              {editMode && (
                <>
                  {!isNew && (
                    <>
                      <Button className="m-r-5" onClick={() => this.cancel()}>
                        {canceling ? spinnerIcon : <i className="fa fa-times m-r-5" />}
                        Cancel
                      </Button>
                      <Button type="primary" onClick={() => this.save()}>
                        {saving ? spinnerIcon : <i className="fa fa-check m-r-5" />}
                        Save Changes
                      </Button>
                    </>
                  )}
                </>
              )}
              {!editMode && canEdit && (
                <Button type="default" onClick={() => this.edit()}><i className="fa fa-edit m-r-5" />Edit</Button>
              )}
              {canEdit && !isNew && (
                <Dropdown
                  className="m-l-5"
                  trigger={['click']}
                  placement="bottomRight"
                  overlay={(
                    <Menu>
                      <Menu.Item>
                        <a onClick={() => this.delete()}>Delete Alert</a>
                      </Menu.Item>
                    </Menu>
                  )}
                >
                  <Button><Icon type="ellipsis" rotate={90} /></Button>
                </Dropdown>
              )}
            </span>
          </div>
        </div>
        <div className="row bg-white tiled p-20">
          <div className={cx('d-flex', { 'col-md-8': !editMode })}>
            <Form className="flex-fill">
              {isNew && (
                <div className="m-b-30">
                  Start by selecting the query that you would like to monitor using the search bar.
                  <br />
                  Keep in mind that Alerts do not work with queries that use parameters.
                </div>
              )}
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
                        <Rearm value={pendingRearm || 0} onChange={this.onRearmChange} editMode />
                      </HorizontalFormItem>
                      <HorizontalFormItem label="Template">
                        <NotificationTemplate
                          alert={alert}
                          query={query}
                          columnNames={queryResult.getColumnNames()}
                          resultValues={queryResult.getData()}
                          subject={options.custom_subject}
                          setSubject={subject => this.setAlertOptions({ custom_subject: subject })}
                          body={options.custom_body}
                          setBody={body => this.setAlertOptions({ custom_body: body })}
                        />
                      </HorizontalFormItem>
                    </>
                  ) : (
                    <HorizontalFormItem label="Notifications" className="form-item-line-height-normal">
                      <Rearm value={pendingRearm || 0} />
                      <br />
                      Set to {options.custom_subject || options.custom_body ? 'custom' : 'default'} notification template.
                    </HorizontalFormItem>
                  )}
                </>
              )}
              {isNew && (
                <HorizontalFormItem>
                  <Button type="primary" onClick={this.save} disabled={!query} className="btn-create-alert">Create Alert</Button>
                </HorizontalFormItem>
              )}
            </Form>
            {editMode && (
              <HelpTrigger className="f-13" type="ALERT_SETUP">
                Setup Instructions <i className="fa fa-question-circle" />
              </HelpTrigger>
            )}
          </div>
          {!editMode && alert.id && (
            <div className="col-md-4">
              <h4>Destinations{' '}
                <Tooltip title="Open Alert Destinations page in a new tab.">
                  <a href="/destinations" target="_blank">
                    <i className="fa fa-external-link f-13" />
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
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
