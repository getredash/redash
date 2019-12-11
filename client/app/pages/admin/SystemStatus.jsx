import { omit } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";

import Layout from "@/components/admin/Layout";
import * as StatusBlock from "@/components/admin/StatusBlock";

import { $http } from "@/services/ng";
import recordEvent from "@/services/recordEvent";
import PromiseRejectionError from "@/lib/promise-rejection-error";
import { routesToAngularRoutes } from "@/lib/utils";

import "./system-status.less";

class SystemStatus extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    queues: [],
    manager: null,
    databaseMetrics: {},
    status: {},
  };

  _refreshTimer = null;

  componentDidMount() {
    recordEvent("view", "page", "admin/status");
    this.refresh();
  }

  componentWillUnmount() {
    clearTimeout(this._refreshTimer);
  }

  refresh = () => {
    $http
      .get("/status.json")
      .then(({ data }) => {
        this.setState({
          queues: data.manager.queues,
          manager: {
            startedAt: data.manager.started_at * 1000,
            lastRefreshAt: data.manager.last_refresh_at * 1000,
            outdatedQueriesCount: data.manager.outdated_queries_count,
          },
          databaseMetrics: data.database_metrics.metrics || [],
          status: omit(data, ["workers", "manager", "database_metrics"]),
        });
      })
      .catch(error => {
        // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
        if (error.status && error.data) {
          error = new PromiseRejectionError(error);
        }
        this.props.onError(error);
      });
    this._refreshTimer = setTimeout(this.refresh, 60 * 1000);
  };

  render() {
    return (
      <Layout activeTab="system_status">
        <div className="system-status-page">
          <div className="system-status-page-blocks">
            <div className="system-status-page-block">
              <StatusBlock.General info={this.state.status} />
            </div>
            <div className="system-status-page-block">
              <StatusBlock.Manager info={this.state.manager} />
            </div>
            <div className="system-status-page-block">
              <StatusBlock.Queues info={this.state.queues} />
            </div>
            <div className="system-status-page-block">
              <StatusBlock.DatabaseMetrics info={this.state.databaseMetrics} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }
}

export default function init(ngModule) {
  ngModule.component("pageSystemStatus", react2angular(SystemStatus));

  return routesToAngularRoutes(
    [
      {
        path: "/admin/status",
        title: "System Status",
        key: "system_status",
      },
    ],
    {
      template: '<page-system-status on-error="handleError"></page-system-status>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
