import { flatMap, values } from "lodash";
import React from "react";
import { react2angular } from "react2angular";

import Alert from "antd/lib/alert";
import Tabs from "antd/lib/tabs";
import * as Grid from "antd/lib/grid";
import Layout from "@/components/admin/Layout";
import { CounterCard } from "@/components/admin/CeleryStatus";
import { WorkersTable, QueuesTable, OtherJobsTable } from "@/components/admin/RQStatus";

import { $http, $location, $rootScope } from "@/services/ng";
import recordEvent from "@/services/recordEvent";
import { routesToAngularRoutes } from "@/lib/utils";
import moment from "moment";

class Jobs extends React.Component {
  state = {
    activeTab: $location.hash(),
    isLoading: true,
    error: null,

    queueCounters: [],
    overallCounters: { started: 0, queued: 0 },
    startedJobs: [],
    workers: [],
  };

  _refreshTimer = null;

  componentDidMount() {
    recordEvent("view", "page", "admin/rq_status");
    this.refresh();
  }

  componentWillUnmount() {
    // Ignore data after component unmounted
    clearTimeout(this._refreshTimer);
    this.processQueues = () => {};
    this.handleError = () => {};
  }

  refresh = () => {
    $http
      .get("/api/admin/queries/rq_status")
      .then(({ data }) => this.processQueues(data))
      .catch(error => this.handleError(error));

    this._refreshTimer = setTimeout(this.refresh, 60 * 1000);
  };

  processQueues = ({ queues, workers }) => {
    const queueCounters = values(queues).map(({ started, ...rest }) => ({
      started: started.length,
      ...rest,
    }));

    const overallCounters = queueCounters.reduce(
      (c, q) => ({
        started: c.started + q.started,
        queued: c.queued + q.queued,
      }),
      { started: 0, queued: 0 }
    );

    const startedJobs = flatMap(values(queues), queue =>
      queue.started.map(job => ({
        ...job,
        enqueued_at: moment.utc(job.enqueued_at),
        started_at: moment.utc(job.started_at),
      }))
    );

    this.setState({ isLoading: false, queueCounters, startedJobs, overallCounters, workers });
  };

  handleError = error => {
    this.setState({ isLoading: false, error });
  };

  render() {
    const { isLoading, error, queueCounters, startedJobs, overallCounters, workers, activeTab } = this.state;

    const changeTab = newTab => {
      $location.hash(newTab);
      $rootScope.$applyAsync();
      this.setState({ activeTab: newTab });
    };

    return (
      <Layout activeTab="jobs">
        <div className="p-15">
          {error && <Alert type="error" message="Failed loading status. Please refresh." />}

          {!error && (
            <React.Fragment>
              <Grid.Row gutter={15} className="m-b-15">
                <Grid.Col span={8}>
                  <CounterCard title="Started Jobs" value={overallCounters.started} loading={isLoading} />
                </Grid.Col>
                <Grid.Col span={8}>
                  <CounterCard title="Queued Jobs" value={overallCounters.queued} loading={isLoading} />
                </Grid.Col>
              </Grid.Row>

              <Tabs activeKey={activeTab || "queues"} onTabClick={changeTab} animated={false}>
                <Tabs.TabPane key="queues" tab="Queues">
                  <QueuesTable loading={isLoading} items={queueCounters} />
                </Tabs.TabPane>
                <Tabs.TabPane key="workers" tab="Workers">
                  <WorkersTable loading={isLoading} items={workers} />
                </Tabs.TabPane>
                <Tabs.TabPane key="other" tab="Other Jobs">
                  <OtherJobsTable loading={isLoading} items={startedJobs} />
                </Tabs.TabPane>
              </Tabs>
            </React.Fragment>
          )}
        </div>
      </Layout>
    );
  }
}

export default function init(ngModule) {
  ngModule.component("pageJobs", react2angular(Jobs));

  return routesToAngularRoutes(
    [
      {
        path: "/admin/queries/jobs",
        title: "RQ Status",
        key: "jobs",
      },
    ],
    {
      template: "<page-jobs></page-jobs>",
    }
  );
}

init.init = true;
