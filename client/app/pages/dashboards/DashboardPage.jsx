import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { map } from 'lodash';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { FavoritesControl } from '@/components/FavoritesControl';
import { EditInPlace } from '@/components/EditInPlace';
import { DashboardTagsControl } from '@/components/tags-control/TagsControl';
import { Dashboard } from '@/services/dashboard';
import { $route } from '@/services/ng';
import getTags from '@/services/getTags';
import { clientConfig } from '@/services/auth';
import { durationHumanize } from '@/filters';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import useDashboard from './useDashboard';

import './DashboardPage.less';

function getDashboardTags() {
  return getTags('api/dashboards/tags').then(tags => map(tags, t => t.name));
}

function buttonType(value) {
  return value ? 'primary' : 'default';
}

function DashboardPageTitle({ dashboardOptions }) {
  const { dashboard, canEditDashboard, updateDashboard, editingLayout } = dashboardOptions;
  return (
    <div className="page-title col-xs-8 col-sm-7 col-lg-7 p-l-0">
      <FavoritesControl item={dashboard} />
      <h3>
        <EditInPlace
          isEditable={editingLayout}
          onDone={name => updateDashboard({ name })}
          value={dashboard.name}
          editor="input"
          ignoreBlanks
        />
      </h3>
      <img src={dashboard.user.profile_image_url} className="profile-image" alt={dashboard.user.name} />
      <DashboardTagsControl
        className="hidden-xs"
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
  dashboardOptions: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function RefreshButton({ dashboardOptions }) {
  const { refreshRate, setRefreshRate, refreshing, refreshDashboard } = dashboardOptions;
  const refreshRateOptions = clientConfig.dashboardRefreshIntervals;
  const onRefreshRateSelected = ({ key }) => {
    const parsedRefreshRate = parseFloat(key);
    if (parsedRefreshRate) {
      setRefreshRate(parsedRefreshRate);
      refreshDashboard();
    } else {
      setRefreshRate(null);
    }
  };
  return (
    <Button.Group>
      <Tooltip title={refreshRate ? `Auto Refreshing every ${durationHumanize(refreshRate)}` : null}>
        <Button
          type={buttonType(refreshRate)}
          onClick={() => refreshDashboard()}
        >
          <i className={cx('zmdi zmdi-refresh m-r-5', { 'zmdi-hc-spin': refreshing })} />
          {refreshRate ? durationHumanize(refreshRate) : 'Refresh'}
        </Button>
      </Tooltip>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        overlay={(
          <Menu onClick={onRefreshRateSelected} selectedKeys={[`${refreshRate}`]}>
            {refreshRateOptions.map(option => (
              <Menu.Item key={`${option}`}>
                {durationHumanize(option)}
              </Menu.Item>
            ))}
            {refreshRate && (
              <Menu.Item key={null}>
                Disable auto refresh
              </Menu.Item>
            )}
          </Menu>
        )}
      >
        <Button className="icon-button hidden-xs" type={buttonType(refreshRate)}>
          <i className="fa fa-angle-down" />
          <span className="sr-only">Split button!</span>
        </Button>
      </Dropdown>
    </Button.Group>
  );
}

RefreshButton.propTypes = {
  dashboardOptions: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardMoreOptionsButton({ dashboardOptions }) {
  const { dashboard } = dashboardOptions;
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      overlay={(
        <Menu>
          <Menu.Item>Edit</Menu.Item>
          <Menu.Item>Manage Permissions</Menu.Item>
          {!dashboard.is_draft && <Menu.Item>Unpublish</Menu.Item>}
          <Menu.Item>Archive</Menu.Item>
        </Menu>
      )}
    >
      <Button className="icon-button m-l-5"><Icon type="ellipsis" rotate={90} /></Button>
    </Dropdown>
  );
}

DashboardMoreOptionsButton.propTypes = {
  dashboardOptions: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardControl({ dashboardOptions }) {
  const { dashboard, updateDashboard, editingLayout,
    canEditDashboard, fullscreen, toggleFullscreen, openShareDialog } = dashboardOptions;
  const showPublishButton = dashboard.is_draft;
  const showRefreshButton = true;
  const showFullscreenButton = !dashboard.is_draft;
  const showShareButton = dashboard.publicAccessEnabled || canEditDashboard && !dashboard.is_draft;
  const showMoreOptionsButton = canEditDashboard;
  return (
    <div className="col-xs-4 col-sm-5 col-lg-5 text-right dashboard-control p-r-0">
      {(!dashboard.is_archived && !editingLayout) && (
        <span className="hidden-print">
          {showPublishButton && (
            <Button className="m-r-5" onClick={() => updateDashboard({ is_draft: false })}>
              <span className="fa fa-paper-plane m-r-5" /> Publish
            </Button>
          )}
          {showRefreshButton && <RefreshButton dashboardOptions={dashboardOptions} />}
          <span className="hidden-xs">
            {showFullscreenButton && (
              <Tooltip title="Enable/Disable Fullscreen display">
                <Button type={buttonType(fullscreen)} className="icon-button m-l-5" onClick={toggleFullscreen}>
                  <i className="zmdi zmdi-fullscreen" />
                </Button>
              </Tooltip>
            )}
            {showShareButton && (
              <Tooltip title="Dashboard Sharing Options">
                <Button
                  className="icon-button m-l-5"
                  type={buttonType(dashboard.publicAccessEnabled)}
                  onClick={openShareDialog}
                  data-test="OpenShareForm"
                >
                  <i className="zmdi zmdi-share" />
                </Button>
              </Tooltip>
            )}
            {showMoreOptionsButton && <DashboardMoreOptionsButton dashboardOptions={dashboardOptions} />}
          </span>
        </span>
      )}
    </div>
  );
}

DashboardControl.propTypes = {
  dashboardOptions: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardHeader({ dashboardOptions }) {
  return (
    <div className="row dashboard-header">
      <DashboardPageTitle dashboardOptions={dashboardOptions} />
      <DashboardControl dashboardOptions={dashboardOptions} />
    </div>
  );
}

DashboardHeader.propTypes = {
  dashboardOptions: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardComponent(props) {
  const dashboardOptions = useDashboard(props.dashboard);
  const { dashboard, widgets, filters, loadWidget,
    refreshWidget, editingLayout } = dashboardOptions;

  return (
    <>
      <DashboardHeader
        dashboardOptions={dashboardOptions}
      />
      <div id="dashboard-container">
        <DashboardGrid
          dashboard={dashboard}
          widgets={widgets}
          filters={filters}
          isEditing={editingLayout} // "$ctrl.layoutEditing && !$ctrl.isGridDisabled"
          // on-layout-change="$ctrl.onLayoutChange"
          // on-breakpoint-change="$ctrl.onBreakpointChanged"
          onLoadWidget={loadWidget}
          onRefreshWidget={refreshWidget}
          // on-remove-widget="$ctrl.removeWidget"
          // on-parameter-mappings-change="$ctrl.extractGlobalParameters"
        />
      </div>
    </>
  );
}

DashboardComponent.propTypes = {
  dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    Dashboard.get({ slug: $route.current.params.dashboardSlug }).$promise
      .then(setDashboard)
      .catch((error) => { throw new PromiseRejectionError(error); });
  }, []);

  return (
    <div className="container">
      {dashboard && <DashboardComponent dashboard={dashboard} />}
    </div>
  );
}

export default function init(ngModule) {
  ngModule.component('dashboardPage', react2angular(DashboardPage));

  return {
    '/dashboard/:dashboardSlug': {
      template: '<dashboard-page></dashboard-page>',
      reloadOnSearch: false,
    },
  };
}

init.init = true;
