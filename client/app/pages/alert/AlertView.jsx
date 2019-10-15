import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import { TimeAgo } from '@/components/TimeAgo';
import { Alert as AlertType } from '@/components/proptypes';

import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Tooltip from 'antd/lib/tooltip';

import Title from './components/Title';
import Criteria from './components/Criteria';
import Rearm from './components/Rearm';
import Query from './components/Query';
import AlertDestinations from './components/AlertDestinations';
import HorizontalFormItem from './components/HorizontalFormItem';
import { STATE_CLASS } from '../alerts/AlertsList';


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

export default class AlertView extends React.Component {
  render() {
    const { alert, queryResult, canEdit, onEdit } = this.props;
    const { query, name, options, rearm } = alert;

    return (
      <>
        <Title name={name} alert={alert}>
          <Tooltip title={canEdit ? '' : 'You do not have sufficient permissions to edit this alert'}>
            <Button type="default" onClick={canEdit ? onEdit : null} className={cx({ disabled: !canEdit })}><i className="fa fa-edit m-r-5" />Edit</Button>
            <Dropdown
              className={cx('m-l-5', { disabled: !canEdit })}
              trigger={[canEdit ? 'click' : undefined]}
              placement="bottomRight"
              overlay={(
                <Menu>
                  <Menu.Item>
                    <a onClick={this.props.delete}>Delete Alert</a>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button><Icon type="ellipsis" rotate={90} /></Button>
            </Dropdown>
          </Tooltip>
        </Title>
        <div className="row bg-white tiled p-20">
          <div className="d-flex col-md-8">
            <Form className="flex-fill">
              <HorizontalFormItem>
                <AlertState state={alert.state} lastTriggered={alert.last_triggered_at} />
              </HorizontalFormItem>
              <HorizontalFormItem label="Query">
                <Query query={query} queryResult={queryResult} onChange={this.onQuerySelected} />
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
                    />
                  </HorizontalFormItem>
                  <HorizontalFormItem label="Notifications" className="form-item-line-height-normal">
                    <Rearm value={rearm || 0} />
                    <br />
                    Set to {options.custom_subject || options.custom_body ? 'custom' : 'default'} notification template.
                  </HorizontalFormItem>
                </>
              )}
            </Form>
          </div>
          <div className="col-md-4">
            <h4>Destinations{' '}
              <Tooltip title="Open Alert Destinations page in a new tab.">
                <a href="destinations" target="_blank">
                  <i className="fa fa-external-link f-13" />
                </a>
              </Tooltip>
            </h4>
            <AlertDestinations alertId={alert.id} />
          </div>
        </div>
      </>
    );
  }
}

AlertView.propTypes = {
  alert: AlertType.isRequired,
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types,
  canEdit: PropTypes.bool.isRequired,
  delete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

AlertView.defaultProps = {
  queryResult: null,
};
