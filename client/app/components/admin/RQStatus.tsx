import { map } from "lodash";
import React from "react";

import Badge from "antd/lib/badge";
import Card from "antd/lib/card";
import Spin from "antd/lib/spin";
import Table from "antd/lib/table";
import { Columns } from "@/components/items-list/components/ItemsTable";

type OwnCounterCardProps = {
    title: string;
    value?: number | string;
    loading: boolean;
};

type CounterCardProps = OwnCounterCardProps & typeof CounterCard.defaultProps;

// CounterCard

export function CounterCard({ title, value, loading }: CounterCardProps) {
  return (
    <Spin spinning={loading}>
      <Card>
        {title}
        <div className="f-20">{value}</div>
      </Card>
    </Spin>
  );
}

CounterCard.defaultProps = {
  value: "",
};

// Tables

const queryJobsColumns = [
  { title: "Queue", dataIndex: "origin" },
  { title: "Query ID", dataIndex: ["meta", "query_id"] },
  { title: "Org ID", dataIndex: ["meta", "org_id"] },
  { title: "Data Source ID", dataIndex: ["meta", "data_source_id"] },
  { title: "User ID", dataIndex: ["meta", "user_id"] },
  Columns.custom((scheduled: any) => scheduled.toString(), { title: "Scheduled", dataIndex: ["meta", "scheduled"] }),
  Columns.timeAgo({ title: "Start Time", dataIndex: "started_at" }),
  Columns.timeAgo({ title: "Enqueue Time", dataIndex: "enqueued_at" }),
];

const otherJobsColumns = [
  { title: "Queue", dataIndex: "origin" },
  { title: "Job Name", dataIndex: "name" },
  Columns.timeAgo({ title: "Start Time", dataIndex: "started_at" }),
  Columns.timeAgo({ title: "Enqueue Time", dataIndex: "enqueued_at" }),
];

const workersColumns = [
  Columns.custom(
    (value: any) => <span>
      {/* @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      <Badge status={{ busy: "processing", idle: "default", started: "success", suspended: "warning" }[value]} />{" "}
      {value}
    </span>,
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

type WorkersTableProps = {
    loading: boolean;
    items: any[];
};

type QueuesTableProps = {
    loading: boolean;
    items: any[];
};

type QueryJobsTableProps = {
    loading: boolean;
    items: any[];
};

type OtherJobsTableProps = {
    loading: boolean;
    items: any[];
};

export function WorkersTable({ loading, items }: WorkersTableProps) {
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

export function QueuesTable({ loading, items }: QueuesTableProps) {
  return (
    <Table
      loading={loading}
      columns={queuesColumns}
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

export function QueryJobsTable({ loading, items }: QueryJobsTableProps) {
  return (
    <Table
      loading={loading}
      columns={queryJobsColumns}
      rowKey="id"
      dataSource={items}
      pagination={{
        defaultPageSize: 25,
        pageSizeOptions: ["10", "25", "50"],
        showSizeChanger: true,
      }}
    />
  );
}

export function OtherJobsTable({ loading, items }: OtherJobsTableProps) {
  return (
    <Table
      loading={loading}
      columns={otherJobsColumns}
      rowKey="id"
      dataSource={items}
      pagination={{
        defaultPageSize: 25,
        pageSizeOptions: ["10", "25", "50"],
        showSizeChanger: true,
      }}
    />
  );
}
