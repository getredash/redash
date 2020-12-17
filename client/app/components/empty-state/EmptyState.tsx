import { keys, some } from "lodash";
import React, { useCallback } from "react";
import classNames from "classnames";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import Link from "@/components/Link";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import HelpTrigger from "@/components/HelpTrigger";
import { currentUser } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";
import "./empty-state.less";

type OwnStepProps = {
    show: boolean;
    completed: boolean;
    text?: React.ReactNode;
    url?: string;
    urlTarget?: string;
    urlText?: React.ReactNode;
    onClick?: (...args: any[]) => any;
};

type StepProps = OwnStepProps & typeof Step.defaultProps;

export function Step({ show, completed, text, url, urlTarget, urlText, onClick }: StepProps) {
  if (!show) {
    return null;
  }

  return (
    <li className={classNames({ done: completed })}>
      <Link href={url} onClick={onClick} target={urlTarget}>
        {urlText}
      </Link>{" "}
      {text}
    </li>
  );
}

Step.defaultProps = {
  url: null,
  urlTarget: null,
  urlText: null,
  text: null,
  onClick: null,
};

type EmptyStateHelpMessageProps = {
    helpTriggerType: string;
};

export function EmptyStateHelpMessage({ helpTriggerType }: EmptyStateHelpMessageProps) {
  return (
    <p>
      Need more support?{" "}
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <HelpTrigger className="f-14" type={helpTriggerType} showTooltip={false}>
        See our Help
      </HelpTrigger>
    </p>
  );
}

type OwnEmptyStateProps = {
    icon?: string;
    header?: string;
    description: string;
    illustration: string;
    illustrationPath?: string;
    helpMessage?: React.ReactNode;
    closable?: boolean;
    onClose?: (...args: any[]) => any;
    onboardingMode?: boolean;
    showAlertStep?: boolean;
    showDashboardStep?: boolean;
    showDataSourceStep?: boolean;
    showInviteStep?: boolean;
    getStepItems?: (...args: any[]) => any;
};

type EmptyStateProps = OwnEmptyStateProps & typeof EmptyState.defaultProps;

function EmptyState({ icon, header, description, illustration, helpMessage, closable, onClose, onboardingMode, showAlertStep, showDashboardStep, showDataSourceStep, showInviteStep, getStepsItems, illustrationPath, }: EmptyStateProps) {
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
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    CreateDashboardDialog.showModal();
  }, []);

  // Show if `onboardingMode=false` or any requested step not completed
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const shouldShow = !onboardingMode || some(keys(isAvailable), step => isAvailable[step] && !isCompleted[step]);

  if (!shouldShow) {
    return null;
  }

  const renderDataSourcesStep = () => {
    if (currentUser.isAdmin) {
      return (
        <Step
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key="dataSources"
          show={isAvailable.dataSource}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          completed={isCompleted.dataSource}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          url="data_sources/new"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          urlText="Connect a Data Source"
        />
      );
    }

    return (
      <Step
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
        key="dataSources"
        show={isAvailable.dataSource}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
        completed={isCompleted.dataSource}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key="queries"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          show={isAvailable.query}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          completed={isCompleted.query}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          url="queries/new"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          urlText="Create your first Query"
        />
      ),
    },
    {
      key: "alerts",
      node: (
        <Step
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key="alerts"
          show={isAvailable.alert}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          completed={isCompleted.alert}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          url="alerts/new"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          urlText="Create your first Alert"
        />
      ),
    },
    {
      key: "dashboards",
      node: (
        <Step
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key="dashboards"
          show={isAvailable.dashboard}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          completed={isCompleted.dashboard}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '() => void' is not assignable to type 'never... Remove this comment to see the full error message
          onClick={showCreateDashboardDialog}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          urlText="Create your first Dashboard"
        />
      ),
    },
    {
      key: "users",
      node: (
        <Step
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key="users"
          show={isAvailable.inviteUsers}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          completed={isCompleted.inviteUsers}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          url="users/new"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          urlText="Invite your team members"
        />
      ),
    },
  ];

  // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
  const stepsItems = getStepsItems ? getStepsItems(defaultStepsItems) : defaultStepsItems;
  const imageSource = illustrationPath ? illustrationPath : "static/images/illustrations/" + illustration + ".svg";

  return (
    <div className="empty-state-wrapper">
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
          <ol>{stepsItems.map((item: any) => item.node)}</ol>
          {helpMessage}
        </div>
      </div>
      {closable && (
        <a className="close-button" onClick={onClose}>
          <CloseOutlinedIcon />
        </a>
      )}
    </div>
  );
}

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
