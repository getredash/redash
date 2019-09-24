import React from 'react';
import PropTypes from 'prop-types';

import navigateTo from '@/services/navigateTo';

import { TimeAgo } from '@/components/TimeAgo';
import { Alert as AlertType } from '@/components/proptypes';

import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';

import Title from './components/Title';
import Criteria from './components/Criteria';
import Rearm from './components/Rearm';
import Query from './components/Query';
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
  edit = () => {
    const { id } = this.props.alert;
    navigateTo(`/alerts/${id}/edit`, true);
  }

  render() {
    const { alert, queryResult, canEdit } = this.props;
    const { query, name, options, rearm } = alert;

    return (
      <>
        <Title name={name} alert={alert}>
          {canEdit && (
            <>
              <Button type="default" onClick={() => this.edit()}><i className="fa fa-edit m-r-5" />Edit</Button>
              <Dropdown
                className="m-l-5"
                trigger={['click']}
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
            </>
          )}
        </Title>
        <div className="row bg-white tiled p-20">
          <div className="d-flex col-md-8">
            <Form className="flex-fill">
              <HorizontalFormItem>
                <AlertState state={alert.state} lastTriggered={alert.last_triggered_at} />
              </HorizontalFormItem>
              <HorizontalFormItem label="Query">
                <Query query={query} onChange={this.onQuerySelected} />
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
                  </HorizontalFormItem>
                </>
              )}
            </Form>
          </div>
          <div className="col-md-4">
            <h4>Destinations</h4>
            <div><i className="fa fa-hand-o-right" /> In next PR</div>
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
};

AlertView.defaultProps = {
  queryResult: null,
};
