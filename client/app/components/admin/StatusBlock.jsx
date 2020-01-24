import { isObject, toPairs } from "lodash";
import React from "react";

import List from "antd/lib/list";
import Card from "antd/lib/card";
import AntBadge from "antd/lib/badge";
import TimeAgo from "@/components/TimeAgo";

import { toHuman, prettySize } from "@/lib/utils";

function Badge({ children }) {
  // <Badge> does not properly render if children is a React node, so this is a "hack"
  // to fix its appearance.
  // TODO: Check if this will be fixed in next Antd versions
  if (isObject(children)) {
    children = <span className="ant-scroll-number ant-badge-count ant-badge-multiple-words">{children}</span>;
  }
  return <AntBadge count={children} showZero overflowCount={Infinity} />;
}

export function General({ info }) {
  info = toPairs(info);
  return (
    <Card title="General" size="small">
      {info.length === 0 && <div className="text-muted text-center">No data</div>}
      {info.length > 0 && (
        <List
          size="small"
          itemLayout="vertical"
          dataSource={info}
          renderItem={([name, value]) => <List.Item extra={<Badge>{value}</Badge>}>{toHuman(name)}</List.Item>}
        />
      )}
    </Card>
  );
}

export function DatabaseMetrics({ info }) {
  return (
    <Card title="Redash Database" size="small">
      {info.length === 0 && <div className="text-muted text-center">No data</div>}
      {info.length > 0 && (
        <List
          size="small"
          itemLayout="vertical"
          dataSource={info}
          renderItem={([name, size]) => <List.Item extra={<Badge>{prettySize(size)}</Badge>}>{name}</List.Item>}
        />
      )}
    </Card>
  );
}

export function Queues({ info }) {
  info = toPairs(info);
  return (
    <Card title="Queues" size="small">
      {info.length === 0 && <div className="text-muted text-center">No data</div>}
      {info.length > 0 && (
        <List
          size="small"
          itemLayout="vertical"
          dataSource={info}
          renderItem={([name, queue]) => <List.Item extra={<Badge>{queue.size}</Badge>}>{name}</List.Item>}
        />
      )}
    </Card>
  );
}

export function Manager({ info }) {
  const items = info
    ? [
        <List.Item
          extra={
            <Badge>
              <TimeAgo date={info.lastRefreshAt} placeholder="n/a" />
            </Badge>
          }>
          Last Refresh
        </List.Item>,
        <List.Item
          extra={
            <Badge>
              <TimeAgo date={info.startedAt} placeholder="n/a" />
            </Badge>
          }>
          Started
        </List.Item>,
        <List.Item extra={<Badge>{info.outdatedQueriesCount}</Badge>}>Outdated Queries Count</List.Item>,
      ]
    : [];

  return (
    <Card title="Manager" size="small">
      {!info && <div className="text-muted text-center">No data</div>}
      {info && <List size="small" itemLayout="vertical" dataSource={items} renderItem={item => item} />}
    </Card>
  );
}
