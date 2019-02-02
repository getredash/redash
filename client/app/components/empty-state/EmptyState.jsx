import { keys, some } from 'lodash';
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

function Step({ show, completed, text, url, urlText, onClick }) {
  if (!show) {
    return null;
  }

  return (
    <li className={classNames({ done: completed })}>
      <a href={url || 'javascript:void(0)'} onClick={onClick}>
        {urlText}
      </a>{' '}
      {text}
    </li>
  );
}

Step.propTypes = {
  show: PropTypes.bool.isRequired,
  completed: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
  url: PropTypes.string,
  urlText: PropTypes.string,
  onClick: PropTypes.func,
};

Step.defaultProps = {
  url: null,
  urlText: null,
  onClick: null,
};

export function EmptyState({
  icon,
  title,
  description,
  illustration,
  helpLink,
  onboardingMode,
  showAlertStep,
  showDashboardStep,
  showInviteStep,
}) {
  const isAvailable = {
    dataSource: true,
    query: true,
    alert: showAlertStep,
    dashboard: showDashboardStep,
    inviteUsers: showInviteStep,
  };

  const isCompleted = {
    dataSource: organizationStatus.objectCounters.data_sources > 0,
    query: organizationStatus.objectCounters.queries > 0,
    alert: organizationStatus.objectCounters.alerts > 0,
    dashboard: organizationStatus.objectCounters.dashboards > 0,
    inviteUsers: organizationStatus.objectCounters.users > 1,
  };

  // Show if `onboardingMode=false` or any requested step not completed
  const shouldShow = !onboardingMode || some(keys(isAvailable), step => isAvailable[step] && !isCompleted[step]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="empty-state bg-white tiled">
      <div className="empty-state__summary">
        {title && <h4>{title}</h4>}
        <h2>
          <i className={icon} />
        </h2>
        <p>{description}</p>
        <img
          src={'/static/images/illustrations/' + illustration + '.svg'}
          alt={illustration + ' Illustration'}
          width="75%"
        />
      </div>
      <div className="empty-state__steps">
        <h4>Let&apos;s get started</h4>
        <ol>
          {currentUser.isAdmin && (
            <Step
              show={isAvailable.dataSource}
              completed={isCompleted.dataSource}
              url="data_sources/new"
              urlText="Connect"
              text="a Data Source"
            />
          )}
          {!currentUser.isAdmin && (
            <Step
              show={isAvailable.dataSource}
              completed={isCompleted.dataSource}
              text="Ask an account admin to connect a data source"
            />
          )}
          <Step
            show={isAvailable.query}
            completed={isCompleted.query}
            url="queries/new"
            urlText="Create"
            text="your first Query"
          />
          <Step
            show={isAvailable.alert}
            completed={isCompleted.alert}
            url="alerts/new"
            urlText="Create"
            text="your first Alert"
          />
          <Step
            show={isAvailable.dashboard}
            completed={isCompleted.dashboard}
            onClick={createDashboard}
            urlText="Create"
            text="your first Dashboard"
          />
          <Step
            show={isAvailable.inviteUsers}
            completed={isCompleted.inviteUsers}
            url="users/new"
            urlText="Invite"
            text="your team members"
          />
        </ol>
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

EmptyState.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string.isRequired,
  illustration: PropTypes.string.isRequired,
  helpLink: PropTypes.string.isRequired,

  onboardingMode: PropTypes.bool,
  showAlertStep: PropTypes.bool,
  showDashboardStep: PropTypes.bool,
  showInviteStep: PropTypes.bool,
};

EmptyState.defaultProps = {
  icon: null,
  title: null,

  onboardingMode: false,
  showAlertStep: false,
  showDashboardStep: false,
  showInviteStep: false,
};

export default function init(ngModule) {
  ngModule.component('emptyState', react2angular(EmptyState));
}

init.init = true;
