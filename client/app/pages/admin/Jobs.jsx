import { partition, flatMap, values } from "lodash";
import React from "react";
import moment from "moment";

import Alert from "antd/lib/alert";
import Tabs from "antd/lib/tabs";
import * as Grid from "antd/lib/grid";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Layout from "@/components/admin/Layout";
import { CounterCard, WorkersTable, QueuesTable, QueryJobsTable, OtherJobsTable } from "@/components/admin/RQStatus";

import { axios } from "@/services/axios";
import location from "@/services/location";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";

class Jobs extends React.Component {
  state = {
    activeTab: location.hash,
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
    axios
      .get("/api/admin/queries/rq_status")
      .then(data => this.processQueues(data))
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
    const [startedQueryJobs, otherStartedJobs] = partition(startedJobs, [
      "name",
      "redash.tasks.queries.execution.execute_query",
    ]);

    const changeTab = newTab => {
      location.setHash(newTab);
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
                <Tabs.TabPane key="queries" tab="Queries">
                  <QueryJobsTable loading={isLoading} items={startedQueryJobs} />
                </Tabs.TabPane>
                <Tabs.TabPane key="other" tab="Other Jobs">
                  <OtherJobsTable loading={isLoading} items={otherStartedJobs} />
                </Tabs.TabPane>
              </Tabs>
            </React.Fragment>
          )}
        </div>
      </Layout>
    );
  }
}

routes.register(
  "Admin.Jobs",
  routeWithUserSession({
    path: "/admin/queries/jobs",
    title: "RQ Status",
    render: pageProps => <Jobs {...pageProps} />,
  })
);
