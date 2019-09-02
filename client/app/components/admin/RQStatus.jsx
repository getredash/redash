import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import Table from 'antd/lib/table';
import { Columns } from '@/components/items-list/components/ItemsTable';

// Tables

const otherJobsColumns = [
  { title: 'Queue', dataIndex: 'queue' },
  { title: 'Job Name', dataIndex: 'name' },
  Columns.timeAgo({ title: 'Start Time', dataIndex: 'started_at' }),
  Columns.timeAgo({ title: 'Enqueue Time', dataIndex: 'enqueued_at' }),
];

const queuesColumns = map(
  ['Name', 'Started', 'Queued'],
  c => ({ title: c, dataIndex: c.toLowerCase() }),
);

const TablePropTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export function QueuesTable({ loading, items }) {
  return (
    <Table
      loading={loading}
      columns={queuesColumns}
      rowKey="name"
      dataSource={items}
    />
  );
}

QueuesTable.propTypes = TablePropTypes;

export function OtherJobsTable({ loading, items }) {
  return (
    <Table
      loading={loading}
      columns={otherJobsColumns}
      rowKey="id"
      dataSource={items}
    />
  );
}

OtherJobsTable.propTypes = TablePropTypes;
