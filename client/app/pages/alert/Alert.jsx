import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { head, includes, toString } from 'lodash';

import { $route } from '@/services/ng';
// import { currentUser } from '@/services/auth';
import { Query } from '@/services/query';
import navigateTo from '@/services/navigateTo';
import notification from '@/services/notification';
import { Alert as AlertService } from '@/services/alert';

import { QuerySelector } from '@/components/QuerySelector';
import { HelpTrigger } from '@/components/HelpTrigger';
import { SchedulePhrase } from '@/components/queries/SchedulePhrase';
import { PageHeader } from '@/components/PageHeader';
import AlertDestinations from '@/components/alerts/AlertDestinations';
import LoadingState from '@/components/items-list/components/LoadingState';

import Form from 'antd/lib/form';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';

import { STATE_CLASS } from '../alerts/AlertsList';

const NEW_ALERT_ID = 'new';

function isNewAlert() {
  return $route.current.params.alertId === NEW_ALERT_ID;
}

function WarningIcon() {
  return <Icon type="warning" theme="filled" style={{ color: '#ff4d4f' }} />;
}

function Criteria({ columnNames, resultValues, alertOptions, onChange }) {
  const columnValue = resultValues && head(resultValues)[alertOptions.column];
  const isColumnValueInValid = columnValue && isNaN(columnValue);
  const columnHint = (
    <small>
      Top row value is <code className="p-0">{toString(columnValue) || 'unknown'}</code>
      {isColumnValueInValid && (
      <><br /><WarningIcon /> Invalid value type.</>
      )}
    </small>
  );

  return (
    <HorizontalFormItem
      label="Trigger when"
      className="alert-trigger"
      help={columnHint}
    >
      <div className="input-title">
        <span>Value column</span>
        <Select
          value={alertOptions.column}
          onChange={column => onChange({ column })}
          dropdownMatchSelectWidth={false}
          style={{ minWidth: 100 }}
        >
          {columnNames.map(name => (
            <Select.Option key={name}>{name}</Select.Option>
          ))}
        </Select>
      </div>
      <div className="input-title">
        <span>Condition</span>
        <Select
          value={alertOptions.op}
          onChange={op => onChange({ op })}
          optionLabelProp="label"
          dropdownMatchSelectWidth={false}
          style={{ width: 55 }}
          id="condition"
        >
          <Select.Option value="greater than" label=">">
          &gt; greater than
          </Select.Option>
          <Select.Option value="less than" label="<">
          &lt; less than
          </Select.Option>
          <Select.Option value="equals" label="=">
          = equals
          </Select.Option>
        </Select>
      </div>
      <div className="input-title">
        <span>Threshold</span>
        <InputNumber value={alertOptions.value} onChange={value => onChange({ value })} />
      </div>
    </HorizontalFormItem>
  );
}

Criteria.propTypes = {
  columnNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  resultValues: PropTypes.arrayOf(PropTypes.object).isRequired,
  alertOptions: PropTypes.shape({
    column: PropTypes.string.isRequired,
    op: PropTypes.oneOf(['greater than', 'less than', 'equals']).isRequired,
    value: PropTypes.any.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

function QueryFormItem({ query, onChange }) {
  const link = query ? (
    <Tooltip title="Open query in a new tab.">{' '}
      {/* eslint-disable-next-line react/jsx-no-target-blank */}
      <a href={`/queries/${query.id}`} target="_blank" rel="noopener">
        <i className="fa fa-external-link" />
      </a>
    </Tooltip>
  ) : null;

  const queryHint = query && query.schedule ? (
    <small>
      Scheduled to refresh <i style={{ textTransform: 'lowercase' }}><SchedulePhrase schedule={query.schedule} isNew={false} /></i>
    </small>
  ) : (
    <small>
      <WarningIcon /> This query has no <i>refresh schedule</i>.{' '}
      <Tooltip title="A query schedule is not necessary but is highly recommended for alerts. An Alert without a query schedule will only send notifications if a user in your organization manually executes this query."><a>Why it&apos;s recommended <Icon type="question-circle" theme="twoTone" /></a></Tooltip>
    </small>
  );

  return (
    <HorizontalFormItem
      label={<>Query{link}</>}
      help={query && queryHint}
    >
      <QuerySelector
        onChange={onChange}
        selectedQuery={query}
        className="alert-query-selector"
        type="select"
      />
    </HorizontalFormItem>
  );
}

QueryFormItem.propTypes = {
  query: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onChange: PropTypes.func.isRequired,
};

QueryFormItem.defaultProps = {
  query: null,
};

function HorizontalFormItem({ children, label, ...props }) {
  const labelCol = { span: 4 };
  const wrapperCol = { span: 12 };
  if (!label) {
    wrapperCol.offset = 4;
  }

  return (
    <Form.Item labelCol={labelCol} wrapperCol={wrapperCol} label={label} {...props}>
      { children }
    </Form.Item>
  );
}

HorizontalFormItem.propTypes = {
  children: PropTypes.node,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
};

HorizontalFormItem.defaultProps = {
  children: null,
  label: null,
};

function AlertState({ state }) {
  return (
    <span className={`alert-state label ${STATE_CLASS[state]}`}>Status: {state}</span>
  );
}

AlertState.propTypes = {
  state: PropTypes.string.isRequired,
};

const DURATIONS = [
  ['Second', 1],
  ['Minute', 60],
  ['Hour', 3600],
  ['Day', 86400],
  ['Week', 604800],
];

function RearmByDuration({ value, onChange }) {
  const [durationIdx, setDurationIdx] = useState();
  const [count, setCount] = useState();

  useEffect(() => {
    for (let i = DURATIONS.length - 1; i >= 0; i -= 1) {
      const [, durValue] = DURATIONS[i];
      if (value % durValue === 0) {
        setDurationIdx(i);
        setCount(value / durValue);
        break;
      }
    }
  }, []);

  const onChangeCount = (newCount) => {
    setCount(newCount);
    onChange(newCount * DURATIONS[durationIdx][1]);
  };

  const onChangeIdx = (newIdx) => {
    setDurationIdx(newIdx);
    onChange(count * DURATIONS[newIdx][1]);
  };

  return (
    <>
      <InputNumber value={count} onChange={onChangeCount} min={1} precision={0} />
      <Select value={durationIdx} onChange={onChangeIdx}>
        {DURATIONS.map(([name], idx) => (
          <Select.Option value={idx} key={name}>{name}{count !== 1 && 's'}</Select.Option>
        ))}
      </Select>
    </>
  );
}

RearmByDuration.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.number.isRequired,
};


function Rearm({ value, onChange }) {
  const [selected, setSelected] = useState(value < 2 ? value : 2);

  const _onChange = (newSelected) => {
    setSelected(newSelected);
    onChange(newSelected < 2 ? newSelected : 3600);
  };

  return (
    <div className="rearm">
      <Select className="alert-notification" optionLabelProp="label" defaultValue={selected || 0} dropdownMatchSelectWidth={false} onChange={_onChange}>
        <Select.Option value={0} label="Just once">Just once</Select.Option>
        <Select.Option value={1} label="Each time results are refreshed">
              Each time results are refreshed
        </Select.Option>
        <Select.Option value={2} label="At most every">At most every ...</Select.Option>
      </Select>
      {selected === 2 && <RearmByDuration value={value} onChange={onChange} />}
    </div>
  );
}

Rearm.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.number,
};

Rearm.defaultProps = {
  value: 0,
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
    // editable: false,
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
        // editable: true,
      });
    } else {
      const { alertId } = $route.current.params;
      AlertService.get({ id: alertId }).$promise.then((alert) => {
        this.setState({
          alert,
          pendingRearm: alert.rearm,
          // editable: currentUser.canEdit(alert),
        });
        this.onQuerySelected(alert.query);
      });
    }
  }

  getDefaultName = () => 'New Alert';

  onQuerySelected = (query) => {
    this.setState(({ alert }) => ({
      alert: Object.assign(alert, { query }),
      queryResult: null,
    }));

    if (query) {
      // get cached result for column names and values
      new Query(query).getQueryResultPromise().then((queryResult) => {
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

  setAlertOptions = (obj) => {
    const { alert } = this.state;
    const options = { ...alert.options, ...obj };
    this.setState({
      alert: Object.assign(alert, { options }),
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

    const { query, name, options, state, id } = alert;
    if (!id) {
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
            <div className="m-t-20">
              <Button type="primary" disabled={!query} onClick={this.save}>Continue</Button>
            </div>
          </div>
        </div>
      );
    }


    const { queryResult } = this.state;

    return (
      <div className="container alert-page">
        <PageHeader title={name || this.getDefaultName()}>
          <AlertState state={state} />
        </PageHeader>
        <SetupInstructions />
        <div className="row bg-white tiled p-10">
          <div className="col-md-8">
            <h4>Criteria</h4>
            <Form>
              <QueryFormItem showHint query={query} onChange={this.onQuerySelected} />
              {query && !queryResult && (
                <HorizontalFormItem className="m-t-30">
                  <Icon type="loading" className="m-r-5" /> Loading query data
                </HorizontalFormItem>
              )}
              {queryResult && (
                <>
                  <Criteria
                    columnNames={queryResult.getColumnNames()}
                    resultValues={queryResult.getData()}
                    alertOptions={options}
                    onChange={this.setAlertOptions}
                  />
                  <HorizontalFormItem label="Send notification">
                    <Rearm value={pendingRearm} onChange={this.onRearmChange} />
                  </HorizontalFormItem>
                  <HorizontalFormItem>
                    <Button type="primary" onClick={this.save}>Save</Button>{' '}
                    <Button type="danger" onClick={this.delete}>Delete Alert</Button>
                  </HorizontalFormItem>
                </>
              )}
            </Form>
          </div>
          <div className="col-md-4">
            <h4>Destinations{' '}
              <Tooltip title="Open Alert Destinations page in a new tab.">
                <a href="/destinations" target="_blank">
                  <i className="fa fa-external-link" />
                </a>
              </Tooltip>
            </h4>
            <AlertDestinations alertId={id} />
          </div>
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('alertPage', react2angular(AlertPage));

  return {
    '/alerts/:alertId': {
      template: '<alert-page></alert-page>',
      title: 'Alerts',
    },
  };
}

init.init = true;
