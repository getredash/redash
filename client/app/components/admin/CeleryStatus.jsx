import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";

import Table from "antd/lib/table";
import Card from "antd/lib/card";
import Spin from "antd/lib/spin";
import Badge from "antd/lib/badge";
import { Columns } from "@/components/items-list/components/ItemsTable";

// CounterCard

export function CounterCard({ title, value, loading }) {
  return (
    <Spin spinning={loading}>
      <Card>
        {title}
        <div className="f-20">{value}</div>
      </Card>
    </Spin>
  );
}

CounterCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool.isRequired,
};

CounterCard.defaultProps = {
  value: "",
};

// Tables

const commonColumns = [
  { title: "Worker Name", dataIndex: "worker" },
  { title: "PID", dataIndex: "worker_pid" },
  { title: "Queue", dataIndex: "queue" },
  Columns.custom(
    value => {
      if (value === "active") {
        return (
          <span>
            <Badge status="processing" /> Active
          </span>
        );
      }
      return (
        <span>
          <Badge status="warning" /> {value}
        </span>
      );
    },
    {
      title: "State",
      dataIndex: "state",
    }
  ),
  Columns.timeAgo({ title: "Start Time", dataIndex: "start_time" }),
];

const queryColumns = commonColumns.concat([
  Columns.timeAgo({ title: "Enqueue Time", dataIndex: "enqueue_time" }),
  { title: "Query ID", dataIndex: "query_id" },
  { title: "Org ID", dataIndex: "org_id" },
  { title: "Data Source ID", dataIndex: "data_source_id" },
  { title: "User ID", dataIndex: "user_id" },
  { title: "Scheduled", dataIndex: "scheduled" },
]);

const queuesColumns = map(["Name", "Active", "Reserved", "Waiting"], c => ({ title: c, dataIndex: c.toLowerCase() }));

const TablePropTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export function QueuesTable({ loading, items }) {
  return <Table loading={loading} columns={queuesColumns} rowKey="name" dataSource={items} />;
}

QueuesTable.propTypes = TablePropTypes;

export function QueriesTable({ loading, items }) {
  return <Table loading={loading} columns={queryColumns} rowKey="task_id" dataSource={items} />;
}

QueriesTable.propTypes = TablePropTypes;
