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

export function EmptyState({
  icon,
  title,
  description,
  illustration,
  helpLink,
  showAlertStep,
  showDashboardStep,
  showInviteStep,
  onboardingMode,
}) {
  const isAdmin = currentUser.isAdmin;

  const dataSourceStepCompleted = organizationStatus.objectCounters.data_sources > 0;
  const queryStepCompleted = organizationStatus.objectCounters.queries > 0;
  const dashboardStepCompleted = organizationStatus.objectCounters.dashboards > 0;
  const alertStepCompleted = organizationStatus.objectCounters.alerts > 0;
  const inviteStepCompleted = organizationStatus.objectCounters.users > 1;

  const shouldShowOnboarding = !onboardingMode || !(
    dataSourceStepCompleted &&
    queryStepCompleted &&
    dashboardStepCompleted &&
    inviteStepCompleted
  );

  if (shouldShowOnboarding) {
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
          <ol>
            <li className={classNames({ done: dataSourceStepCompleted })}>
              {!isAdmin && <span>Ask an account admin to connect a data source.</span>}
              {isAdmin && <span><a href="data_sources">Connect</a> a Data Source</span>}
            </li>
            <li className={classNames({ done: queryStepCompleted })}>
              <a href="queries/new">Create</a> your first Query
            </li>
            { showAlertStep && (
              <li className={classNames({ done: alertStepCompleted })}>
                <a href="alerts/new">Create</a> your first Alert
              </li>
            )}
            { showDashboardStep && (
              <li className={classNames({ done: dashboardStepCompleted })}>
                <a onClick={createDashboard}>Create</a> your first Dashboard
              </li>
            )}
            { showInviteStep && (
              <li className={classNames({ done: inviteStepCompleted })}>
                <a href="users/new">Invite</a> your team members
              </li>
            )}
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
