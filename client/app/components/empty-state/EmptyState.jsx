import { keys, some } from "lodash";
import React, { useCallback } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Link from "@/components/Link";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import HelpTrigger from "@/components/HelpTrigger";
import { currentUser } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";
import "./empty-state.less";

export function Step({ show, completed, text, url, urlText, onClick }) {
  if (!show) {
    return null;
  }

  return (
    <li className={classNames({ done: completed })}>
      <Link href={url} onClick={onClick}>
        {urlText}
      </Link>{" "}
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
  const shouldShow = !onboardingMode || some(keys(isAvailable), step => isAvailable[step] && !isCompleted[step]);

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
          urlText="Connect"
          text="a Data Source"
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
          urlText="Create"
          text="your first Query"
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
          urlText="Create"
          text="your first Alert"
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
          urlText="Create"
          text="your first Dashboard"
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
          urlText="Invite"
          text="your team members"
        />
      ),
    },
  ];

  const stepsItems = getStepsItems ? getStepsItems(defaultStepsItems) : defaultStepsItems;
  const imageSource = illustrationPath ? illustrationPath : "static/images/illustrations/" + illustration + ".svg";

  return (
    <div className="empty-state bg-white tiled">
      <div className="empty-state__summary">
        {header && <h4>{header}</h4>}
        <h2>
          <i className={icon} />
        </h2>
        <p>{description}</p>
        <img src={imageSource} alt={illustration + " Illustration"} width="75%" />
      </div>
      <div className="empty-state__steps">
        <h4>Let&apos;s get started</h4>
        <ol>{stepsItems.map(item => item.node)}</ol>
        {helpMessage}
      </div>
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

  onboardingMode: false,
  showAlertStep: false,
  showDashboardStep: false,
  showDataSourceStep: true,
  showInviteStep: false,
};

export default EmptyState;
