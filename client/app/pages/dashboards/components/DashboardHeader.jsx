import React from "react";
import cx from "classnames";
import PropTypes from "prop-types";
import { map, includes } from "lodash";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";
import Modal from "antd/lib/modal";
import Tooltip from "@/components/Tooltip";
import FavoritesControl from "@/components/FavoritesControl";
import EditInPlace from "@/components/EditInPlace";
import PlainButton from "@/components/PlainButton";
import { DashboardTagsControl } from "@/components/tags-control/TagsControl";
import getTags from "@/services/getTags";
import { clientConfig } from "@/services/auth";
import { policy } from "@/services/policy";
import recordEvent from "@/services/recordEvent";
import { durationHumanize } from "@/lib/utils";
import { DashboardStatusEnum } from "../hooks/useDashboard";

import "./DashboardHeader.less";

function getDashboardTags() {
  return getTags("api/dashboards/tags").then(tags => map(tags, t => t.name));
}

function buttonType(value) {
  return value ? "primary" : "default";
}

function DashboardPageTitle({ dashboardConfiguration }) {
  const { dashboard, canEditDashboard, updateDashboard, editingLayout } = dashboardConfiguration;
  return (
    <div className="title-with-tags">
      <div className="page-title">
        <FavoritesControl item={dashboard} />
        <h3>
          <EditInPlace
            isEditable={editingLayout}
            onDone={name => updateDashboard({ name })}
            value={dashboard.name}
            ignoreBlanks
          />
        </h3>
        <Tooltip title={dashboard.user.name} placement="bottom">
          <img src={dashboard.user.profile_image_url} className="profile-image" alt={dashboard.user.name} />
        </Tooltip>
      </div>
      <DashboardTagsControl
        tags={dashboard.tags}
        isDraft={dashboard.is_draft}
        isArchived={dashboard.is_archived}
        canEdit={canEditDashboard}
        getAvailableTags={getDashboardTags}
        onEdit={tags => updateDashboard({ tags })}
      />
    </div>
  );
}

DashboardPageTitle.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function RefreshButton({ dashboardConfiguration }) {
  const { refreshRate, setRefreshRate, disableRefreshRate, refreshing, refreshDashboard } = dashboardConfiguration;
  const allowedIntervals = policy.getDashboardRefreshIntervals();
  const refreshRateOptions = clientConfig.dashboardRefreshIntervals;
  const onRefreshRateSelected = ({ key }) => {
    const parsedRefreshRate = parseFloat(key);
    if (parsedRefreshRate) {
      setRefreshRate(parsedRefreshRate);
      refreshDashboard();
    } else {
      disableRefreshRate();
    }
  };
  return (
    <Button.Group>
      <Tooltip title={refreshRate ? `Auto Refreshing every ${durationHumanize(refreshRate)}` : null}>
        <Button type={buttonType(refreshRate)} onClick={() => refreshDashboard()}>
          <i className={cx("zmdi zmdi-refresh m-r-5", { "zmdi-hc-spin": refreshing })} aria-hidden="true" />
          {refreshRate ? durationHumanize(refreshRate) : "Refresh"}
        </Button>
      </Tooltip>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        overlay={
          <Menu onClick={onRefreshRateSelected} selectedKeys={[`${refreshRate}`]}>
            {refreshRateOptions.map(option => (
              <Menu.Item key={`${option}`} disabled={!includes(allowedIntervals, option)}>
                {durationHumanize(option)}
              </Menu.Item>
            ))}
            {refreshRate && <Menu.Item key={null}>Disable auto refresh</Menu.Item>}
          </Menu>
        }>
        <Button className="icon-button hidden-xs" type={buttonType(refreshRate)}>
          <i className="fa fa-angle-down" aria-hidden="true" />
          <span className="sr-only">Split button!</span>
        </Button>
      </Dropdown>
    </Button.Group>
  );
}

RefreshButton.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardMoreOptionsButton({ dashboardConfiguration }) {
  const {
    dashboard,
    setEditingLayout,
    togglePublished,
    archiveDashboard,
    managePermissions,
    gridDisabled,
    isDashboardOwnerOrAdmin,
    isDuplicating,
    duplicateDashboard,
  } = dashboardConfiguration;

  const archive = () => {
    Modal.confirm({
      title: "Archive Dashboard",
      content: `Are you sure you want to archive the "${dashboard.name}" dashboard?`,
      okText: "Archive",
      okType: "danger",
      onOk: archiveDashboard,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      overlay={
        <Menu data-test="DashboardMoreButtonMenu">
          <Menu.Item className={cx({ hidden: gridDisabled })}>
            <PlainButton onClick={() => setEditingLayout(true)}>Edit</PlainButton>
          </Menu.Item>
          {!isDuplicating && dashboard.canEdit() && (
            <Menu.Item>
              <PlainButton onClick={duplicateDashboard}>
                Fork <i className="fa fa-external-link m-l-5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </PlainButton>
            </Menu.Item>
          )}
          {clientConfig.showPermissionsControl && isDashboardOwnerOrAdmin && (
            <Menu.Item>
              <PlainButton onClick={managePermissions}>Manage Permissions</PlainButton>
            </Menu.Item>
          )}
          {!clientConfig.disablePublish && !dashboard.is_draft && (
            <Menu.Item>
              <PlainButton onClick={togglePublished}>Unpublish</PlainButton>
            </Menu.Item>
          )}
          <Menu.Item>
            <PlainButton onClick={archive}>Archive</PlainButton>
          </Menu.Item>
        </Menu>
      }>
      <Button className="icon-button m-l-5" data-test="DashboardMoreButton" aria-label="More actions">
        <EllipsisOutlinedIcon rotate={90} aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}

DashboardMoreOptionsButton.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardControl({ dashboardConfiguration, headerExtra }) {
  const {
    dashboard,
    togglePublished,
    canEditDashboard,
    fullscreen,
    toggleFullscreen,
    showShareDashboardDialog,
    updateDashboard,
  } = dashboardConfiguration;
  const showPublishButton = dashboard.is_draft;
  const showRefreshButton = true;
  const showFullscreenButton = !dashboard.is_draft;
  const canShareDashboard = canEditDashboard && !dashboard.is_draft;
  const showShareButton = !clientConfig.disablePublicUrls && (dashboard.publicAccessEnabled || canShareDashboard);
  const showMoreOptionsButton = canEditDashboard;

  const unarchiveDashboard = () => {
    recordEvent("unarchive", "dashboard", dashboard.id);
    updateDashboard({ is_archived: false }, false);
  };
  return (
    <div className="dashboard-control">
      {dashboard.can_edit && dashboard.is_archived && <Button onClick={unarchiveDashboard}>Unarchive</Button>}
      {!dashboard.is_archived && (
        <span className="hidden-print">
          {showPublishButton && (
            <Button className="m-r-5 hidden-xs" onClick={togglePublished}>
              <span className="fa fa-paper-plane m-r-5" /> Publish
            </Button>
          )}
          {showRefreshButton && <RefreshButton dashboardConfiguration={dashboardConfiguration} />}
          {showFullscreenButton && (
            <Tooltip className="hidden-xs" title="Enable/Disable Fullscreen display">
              <Button
                type={buttonType(fullscreen)}
                className="icon-button m-l-5"
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen display">
                <i className="zmdi zmdi-fullscreen" aria-hidden="true" />
              </Button>
            </Tooltip>
          )}
          {headerExtra}
          {showShareButton && (
            <Tooltip title="Dashboard Sharing Options">
              <Button
                className="icon-button m-l-5"
                type={buttonType(dashboard.publicAccessEnabled)}
                onClick={showShareDashboardDialog}
                data-test="OpenShareForm"
                aria-label="Share">
                <i className="zmdi zmdi-share" aria-hidden="true" />
              </Button>
            </Tooltip>
          )}
          {showMoreOptionsButton && <DashboardMoreOptionsButton dashboardConfiguration={dashboardConfiguration} />}
        </span>
      )}
    </div>
  );
}

DashboardControl.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  headerExtra: PropTypes.node,
};

function DashboardEditControl({ dashboardConfiguration, headerExtra }) {
  const {
    setEditingLayout,
    doneBtnClickedWhileSaving,
    dashboardStatus,
    retrySaveDashboardLayout,
  } = dashboardConfiguration;
  let status;
  if (dashboardStatus === DashboardStatusEnum.SAVED) {
    status = <span className="save-status">Saved</span>;
  } else if (dashboardStatus === DashboardStatusEnum.SAVING) {
    status = (
      <span className="save-status" data-saving>
        Saving
      </span>
    );
  } else {
    status = (
      <span className="save-status" data-error>
        Saving Failed
      </span>
    );
  }
  return (
    <div className="dashboard-control">
      {status}
      {dashboardStatus === DashboardStatusEnum.SAVING_FAILED ? (
        <Button type="primary" onClick={retrySaveDashboardLayout}>
          Retry
        </Button>
      ) : (
        <Button loading={doneBtnClickedWhileSaving} type="primary" onClick={() => setEditingLayout(false)}>
          {!doneBtnClickedWhileSaving && <i className="fa fa-check m-r-5" aria-hidden="true" />} Done Editing
        </Button>
      )}
      {headerExtra}
    </div>
  );
}

DashboardEditControl.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  headerExtra: PropTypes.node,
};

export default function DashboardHeader({ dashboardConfiguration, headerExtra }) {
  const { editingLayout } = dashboardConfiguration;
  const DashboardControlComponent = editingLayout ? DashboardEditControl : DashboardControl;

  return (
    <div className="dashboard-header">
      <DashboardPageTitle dashboardConfiguration={dashboardConfiguration} />
      <DashboardControlComponent dashboardConfiguration={dashboardConfiguration} headerExtra={headerExtra} />
    </div>
  );
}

DashboardHeader.propTypes = {
  dashboardConfiguration: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  headerExtra: PropTypes.node,
};
