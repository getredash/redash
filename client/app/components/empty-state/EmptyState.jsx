import { some, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import classNames from 'classnames';
import { $uibModal } from '@/services/ng';
import { currentUser } from '@/services/auth';
import organizationStatus from '@/services/organizationStatus';
import './empty-state.less';

function createDashboard() {
  $uibModal.open({
    component: 'editDashboardDialog',
    resolve: {
      dashboard: () => ({ name: null, layout: null }),
    },
  });
}

function getSteps({
  showAlertStep,
  showDashboardStep,
  showInviteStep,
}) {
  return {
    dataSource: {
      show: true,
      completed: organizationStatus.objectCounters.data_sources > 0,
      render() {
        return currentUser.isAdmin ?
          (<span><a href="data_sources/new">Connect</a> a Data Source</span>) :
          (<span>Ask an account admin to connect a data source.</span>);
      },
    },
    query: {
      show: true,
      completed: organizationStatus.objectCounters.queries > 0,
      render() {
        return (<span><a href="queries/new">Create</a> your first Query</span>);
      },
    },
    alert: {
      show: showAlertStep,
      completed: organizationStatus.objectCounters.alerts > 0,
      render() {
        return (<span><a href="alerts/new">Create</a> your first Alert</span>);
      },
    },
    dashboard: {
      show: showDashboardStep,
      completed: organizationStatus.objectCounters.dashboards > 0,
      render() {
        return (<span><a onClick={createDashboard}>Create</a> your first Dashboard</span>);
      },
    },
    inviteUsers: {
      show: showInviteStep,
      completed: organizationStatus.objectCounters.users > 1,
      render() {
        return (<span><a href="users/new">Invite</a> your team members</span>);
      },
    },
  };
}

function renderStep(step, key) {
  return step.show ? (
    <li key={key} className={classNames({ done: step.completed })}>{step.render(step)}</li>
  ) : null;
}

export function EmptyState({
  icon,
  title,
  description,
  illustration,
  helpLink,
  onboardingMode,
  ...showSteps
}) {
  const steps = getSteps(showSteps);
  const shouldShow = !onboardingMode || some(steps, { show: true, completed: false });

  if (shouldShow) {
    return (
      <div className="empty-state bg-white tiled">
        <div className="empty-state__summary">
          {title && <h4>{title}</h4>}
          {icon && <h2><i className={icon} /></h2>}
          <p>{description}</p>

          <img
            src={'/static/images/illustrations/' + illustration + '.svg'}
            alt={illustration + 'Illustration'}
            width="75%"
          />
        </div>
        <div className="empty-state__steps">
          <h4>Let&apos;s get started</h4>
          <ol>{map(steps, renderStep)}</ol>
          <p>
            Need more support?{' '}
            <a href={helpLink} target="_blank" rel="noopener noreferrer">
              See our Help
              <i className="fa fa-external-link m-l-5" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    );
  }

  return null;
}

EmptyState.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  illustration: PropTypes.string,
  helpLink: PropTypes.string,

  showAlertStep: PropTypes.bool,
  showDashboardStep: PropTypes.bool,
  showInviteStep: PropTypes.bool,
  onboardingMode: PropTypes.bool,
};

EmptyState.defaultProps = {
  icon: null,
  title: null,
  description: null,
  illustration: null,
  helpLink: null,

  showAlertStep: false,
  showDashboardStep: false,
  showInviteStep: false,
  onboardingMode: false,
};

export default function init(ngModule) {
  ngModule.component('emptyState', react2angular(EmptyState));
}

init.init = true;
