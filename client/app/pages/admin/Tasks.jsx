import { values, each } from "lodash";
import moment from "moment";
import React from "react";
import { react2angular } from "react2angular";

import Alert from "antd/lib/alert";
import Tabs from "antd/lib/tabs";
import * as Grid from "antd/lib/grid";
import Layout from "@/components/admin/Layout";
import { CounterCard, QueuesTable, QueriesTable } from "@/components/admin/CeleryStatus";

import { $http } from "@/services/ng";
import recordEvent from "@/services/recordEvent";
import { routesToAngularRoutes } from "@/lib/utils";

// Converting name coming from API to the one the UI expects.
// TODO: update the UI components to use `waiting_in_queue` instead of `waiting`.
function stateName(state) {
  if (state === "waiting_in_queue") {
    return "waiting";
  }
  return state;
}

class Tasks extends React.Component {
  state = {
    isLoading: true,
    error: null,

    queues: [],
    queries: [],
    counters: { active: 0, reserved: 0, waiting: 0 },
  };

  componentDidMount() {
    recordEvent("view", "page", "admin/tasks");
    $http
      .get("/api/admin/queries/tasks")
      .then(({ data }) => this.processTasks(data.tasks))
      .catch(error => this.handleError(error));
  }

  componentWillUnmount() {
    // Ignore data after component unmounted
    this.processTasks = () => {};
    this.handleError = () => {};
  }

  processTasks = tasks => {
    const queues = {};
    const queries = [];

    const counters = { active: 0, reserved: 0, waiting: 0 };

    each(tasks, task => {
      task.state = stateName(task.state);
      queues[task.queue] = queues[task.queue] || { name: task.queue, active: 0, reserved: 0, waiting: 0 };
      queues[task.queue][task.state] += 1;

      if (task.enqueue_time) {
        task.enqueue_time = moment(task.enqueue_time * 1000.0);
      }
      if (task.start_time) {
        task.start_time = moment(task.start_time * 1000.0);
      }

      counters[task.state] += 1;

      if (task.task_name === "redash.tasks.execute_query") {
        queries.push(task);
      }
    });

    this.setState({ isLoading: false, queues: values(queues), queries, counters });
  };

  handleError = error => {
    this.setState({ isLoading: false, error });
  };

  render() {
    const { isLoading, error, queues, queries, counters } = this.state;

    return (
      <Layout activeTab="tasks">
        <div className="p-15">
          {error && <Alert type="error" message="Failed loading status. Please refresh." />}

          {!error && (
            <React.Fragment>
              <Grid.Row gutter={15} className="m-b-15">
                <Grid.Col span={8}>
                  <CounterCard title="Active Tasks" value={counters.active} loading={isLoading} />
                </Grid.Col>
                <Grid.Col span={8}>
                  <CounterCard title="Reserved Tasks" value={counters.reserved} loading={isLoading} />
                </Grid.Col>
                <Grid.Col span={8}>
                  <CounterCard title="Waiting Tasks" value={counters.waiting} loading={isLoading} />
                </Grid.Col>
              </Grid.Row>

              <Tabs defaultActiveKey="queues" animated={false}>
                <Tabs.TabPane key="queues" tab="Queues">
                  <QueuesTable loading={isLoading} items={queues} />
                </Tabs.TabPane>
                <Tabs.TabPane key="queries" tab="Queries">
                  <QueriesTable loading={isLoading} items={queries} />
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
  ngModule.component("pageTasks", react2angular(Tasks));

  return routesToAngularRoutes(
    [
      {
        path: "/admin/queries/tasks",
        title: "Celery Status",
        key: "tasks",
      },
    ],
    {
      template: "<page-tasks></page-tasks>",
    }
  );
}

init.init = true;
