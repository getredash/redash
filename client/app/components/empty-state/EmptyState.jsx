import { some } from 'lodash';
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

export function Step({ completed, text, url = null, onClick = null, urlText, show = true }) {
  if (!show) {
    return null;
  }

  return (
    <li className={classNames({ done: completed })}>
      {onClick && (
        <a href="#" onClick={onClick}>
          {urlText}
        </a>
      )}
      {url && <a href={url}>{urlText}</a>}
      {text}
    </li>
  );
}

export function EmptyState({ icon, title, description, illustration, helpLink, onboardingMode, ...showSteps }) {
  const { showAlertStep, showDashboardStep, showInviteStep } = showSteps;
  const {
    data_sources: dataSourceCount,
    queries: queriesCount,
    alerts: alertsCount,
    dashboards: dashboardsCount,
    users: usersCount,
  } = organizationStatus.objectCounters;
  const shouldShow = !onboardingMode || some(showSteps);

  if (shouldShow) {
    return (
      <div className="empty-state bg-white tiled">
        <div className="empty-state__summary">
          {title && <h4>{title}</h4>}
          {icon && (
            <h2>
              <i className={icon} />
            </h2>
          )}
          <p>{description}</p>
          <img
            src={'/static/images/illustrations/' + illustration + '.svg'}
            alt={illustration + 'Illustration'}
            width="75%"
          />
        </div>
        <div className="empty-state__steps">
          <h4>Let&apos;s get started</h4>
          <ol>
            {currentUser.isAdmin && (
              <Step completed={dataSourceCount > 0} url="data_sources/new" urlText="Connect" text="a Data Source" />
            )}
            {!currentUser.isAdmin && (
              <Step completed={dataSourceCount > 0} text="Ask an account admin to connect a data source." />
            )}
            <Step completed={queriesCount > 0} url="queries/new" urlText="Create" text="your first Qurey" />
            <Step
              show={showAlertStep}
              completed={alertsCount > 0}
              url="alerts/new"
              urlText="Create"
              text="your first Alert"
            />
            <Step
              show={showDashboardStep}
              completed={dashboardsCount > 0}
              onClick={createDashboard}
              urlText="Create"
              text="your first Dashboard"
            />
            <Step
              show={showInviteStep}
              completed={usersCount > 1}
              url="users/new"
              urlText="invite"
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
