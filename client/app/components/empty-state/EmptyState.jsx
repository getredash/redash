import { keys, some } from "lodash";
import React, { useCallback } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import Link from "@/components/Link";
import PlainButton from "@/components/PlainButton";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import HelpTrigger from "@/components/HelpTrigger";
import { currentUser } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";

import "./empty-state.less";

export function Step({ show, completed, text, url, urlText, onClick }) {
  if (!show) {
    return null;
  }

  const commonProps = { children: urlText, onClick };

  return (
    <li className={classNames({ done: completed })}>
      {url ? <Link href={url} {...commonProps} /> : <PlainButton type="link" {...commonProps} />} {text}
    </li>
  );
}

Step.propTypes = {
  show: PropTypes.bool.isRequired,
  completed: PropTypes.bool.isRequired,
  text: PropTypes.node,
  url: PropTypes.string,
  urlTarget: PropTypes.string,
  urlText: PropTypes.node,
  onClick: PropTypes.func,
};

Step.defaultProps = {
  url: null,
  urlTarget: null,
  urlText: null,
  text: null,
  onClick: null,
};

export function EmptyStateHelpMessage({ helpTriggerType }) {
  return (
    <p>
      Need more support?{" "}
      <HelpTrigger className="f-14" type={helpTriggerType} showTooltip={false}>
        See our Help
      </HelpTrigger>
    </p>
  );
}

EmptyStateHelpMessage.propTypes = {
  helpTriggerType: PropTypes.string.isRequired,
};

function EmptyState({
  icon,
  header,
  description,
  illustration,
  helpMessage,
  closable,
  onClose,
  onboardingMode,
  showAlertStep,
  showDashboardStep,
  showDataSourceStep,
  showInviteStep,
  getStepsItems,
  illustrationPath,
}) {
  const isAvailable = {
    dataSource: showDataSourceStep,
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

  const showCreateDashboardDialog = useCallback(() => {
    CreateDashboardDialog.showModal();
  }, []);

  // Show if `onboardingMode=false` or any requested step not completed
  const shouldShow = !onboardingMode || some(keys(isAvailable), (step) => isAvailable[step] && !isCompleted[step]);

  if (!shouldShow) {
    return null;
  }

  const renderDataSourcesStep = () => {
    if (currentUser.isAdmin) {
      return (
        <Step
          key="dataSources"
          show={isAvailable.dataSource}
          completed={isCompleted.dataSource}
          url="data_sources/new"
          urlText="Connect a Data Source"
        />
      );
    }

    return (
      <Step
        key="dataSources"
        show={isAvailable.dataSource}
        completed={isCompleted.dataSource}
        text="Ask an account admin to connect a data source"
      />
    );
  };

  const defaultStepsItems = [
    {
      key: "dataSources",
      node: renderDataSourcesStep(),
    },
    {
      key: "queries",
      node: (
        <Step
          key="queries"
          show={isAvailable.query}
          completed={isCompleted.query}
          url="queries/new"
          urlText="Create your first Query"
        />
      ),
    },
    {
      key: "alerts",
      node: (
        <Step
          key="alerts"
          show={isAvailable.alert}
          completed={isCompleted.alert}
          url="alerts/new"
          urlText="Create your first Alert"
        />
      ),
    },
    {
      key: "dashboards",
      node: (
        <Step
          key="dashboards"
          show={isAvailable.dashboard}
          completed={isCompleted.dashboard}
          onClick={showCreateDashboardDialog}
          urlText="Create your first Dashboard"
        />
      ),
    },
    {
      key: "users",
      node: (
        <Step
          key="users"
          show={isAvailable.inviteUsers}
          completed={isCompleted.inviteUsers}
          url="users/new"
          urlText="Invite your team members"
        />
      ),
    },
  ];

  const stepsItems = getStepsItems ? getStepsItems(defaultStepsItems) : defaultStepsItems;
  const imageSource = illustrationPath ? illustrationPath : "/static/images/illustrations/" + illustration + ".svg";

  return (
    <div className="empty-state-wrapper">
      <div className="empty-state bg-white tiled">
        <div className="empty-state__summary">
          {header && <h4>{header}</h4>}
          <h2>
            <i className={icon} aria-hidden="true" />
          </h2>
          <p>{description}</p>
          <img src={imageSource} alt={illustration + " Illustration"} width="75%" />
        </div>
        <div className="empty-state__steps">
          <h4>Let&apos;s get started</h4>
          <ol>{stepsItems.map((item) => item.node)}</ol>
          {helpMessage}
        </div>
      </div>
      {closable && (
        <PlainButton className="close-button" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon />
        </PlainButton>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.string,
  header: PropTypes.string,
  description: PropTypes.string.isRequired,
  illustration: PropTypes.string.isRequired,
  illustrationPath: PropTypes.string,
  helpMessage: PropTypes.node,
  closable: PropTypes.bool,
  onClose: PropTypes.func,

  onboardingMode: PropTypes.bool,
  showAlertStep: PropTypes.bool,
  showDashboardStep: PropTypes.bool,
  showDataSourceStep: PropTypes.bool,
  showInviteStep: PropTypes.bool,

  getStepItems: PropTypes.func,
};

EmptyState.defaultProps = {
  icon: null,
  header: null,
  helpMessage: null,
  closable: false,
  onClose: () => {},

  onboardingMode: false,
  showAlertStep: false,
  showDashboardStep: false,
  showDataSourceStep: true,
  showInviteStep: false,
};

export default EmptyState;
