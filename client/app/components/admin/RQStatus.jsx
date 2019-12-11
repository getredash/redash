import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";

import Badge from "antd/lib/badge";
import Table from "antd/lib/table";
import { Columns } from "@/components/items-list/components/ItemsTable";

// Tables

const otherJobsColumns = [
  { title: "Queue", dataIndex: "queue" },
  { title: "Job Name", dataIndex: "name" },
  Columns.timeAgo({ title: "Start Time", dataIndex: "started_at" }),
  Columns.timeAgo({ title: "Enqueue Time", dataIndex: "enqueued_at" }),
];

const workersColumns = [
  Columns.custom(
    value => (
      <span>
        <Badge status={{ busy: "processing", idle: "default", started: "success", suspended: "warning" }[value]} />{" "}
        {value}
      </span>
    ),
    { title: "State", dataIndex: "state" }
  ),
]
  .concat(
    map(["Hostname", "PID", "Name", "Queues", "Current Job", "Successful Jobs", "Failed Jobs"], c => ({
      title: c,
      dataIndex: c.toLowerCase().replace(/\s/g, "_"),
    }))
  )
  .concat([
    Columns.dateTime({ title: "Birth Date", dataIndex: "birth_date" }),
    Columns.duration({ title: "Total Working Time", dataIndex: "total_working_time" }),
  ]);

const queuesColumns = map(["Name", "Started", "Queued"], c => ({ title: c, dataIndex: c.toLowerCase() }));

const TablePropTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export function WorkersTable({ loading, items }) {
  return (
    <Table
      loading={loading}
      columns={workersColumns}
      rowKey="name"
      dataSource={items}
      pagination={{
        defaultPageSize: 25,
        pageSizeOptions: ["10", "25", "50"],
        showSizeChanger: true,
      }}
    />
  );
}

WorkersTable.propTypes = TablePropTypes;

export function QueuesTable({ loading, items }) {
  return <Table loading={loading} columns={queuesColumns} rowKey="name" dataSource={items} />;
}

QueuesTable.propTypes = TablePropTypes;

export function OtherJobsTable({ loading, items }) {
  return <Table loading={loading} columns={otherJobsColumns} rowKey="id" dataSource={items} />;
}

OtherJobsTable.propTypes = TablePropTypes;
