import React from "react";
import PropTypes from "prop-types";
import Card from "antd/lib/card";
import WarningFilledIcon from "@ant-design/icons/WarningFilled";
import Typography from "antd/lib/typography";
import Link from "@/components/Link";
import DynamicComponent from "@/components/DynamicComponent";
import { currentUser } from "@/services/auth";

import useQueryFlags from "../hooks/useQueryFlags";
import "./QuerySourceAlerts.less";

export default function QuerySourceAlerts({ query, dataSourcesAvailable }) {
  const queryFlags = useQueryFlags(query); // we don't use flags that depend on data source

  let message = null;
  if (queryFlags.isNew && !queryFlags.canCreate) {
    message = (
      <React.Fragment>
        <Typography.Title level={4}>
          You don't have permission to create new queries on any of the data sources available to you.
        </Typography.Title>
        <p>
          <Typography.Text type="secondary">
            You can either <Link href="queries">browse existing queries</Link>, or ask for additional permissions from
            your Redash admin.
          </Typography.Text>
        </p>
      </React.Fragment>
    );
  } else if (!dataSourcesAvailable) {
    if (currentUser.isAdmin) {
      message = (
        <React.Fragment>
          <Typography.Title level={4}>
            Looks like no data sources were created yet or none of them available to the group(s) you're member of.
          </Typography.Title>
          <p>
            <Typography.Text type="secondary">Please create one first, and then start querying.</Typography.Text>
          </p>

          <div className="query-source-alerts-actions">
            <Link.Button type="primary" href="data_sources/new">
              Create Data Source
            </Link.Button>
            <Link.Button type="default" href="groups">
              Manage Group Permissions
            </Link.Button>
          </div>
        </React.Fragment>
      );
    } else {
      message = (
        <React.Fragment>
          <Typography.Title level={4}>
            Looks like no data sources were created yet or none of them available to the group(s) you're member of.
          </Typography.Title>
          <p>
            <Typography.Text type="secondary">Please ask your Redash admin to create one first.</Typography.Text>
          </p>
        </React.Fragment>
      );
    }
  }

  if (!message) {
    return null;
  }

  return (
    <div className="query-source-alerts">
      <Card>
        <DynamicComponent name="QuerySource.Alerts" query={query} dataSourcesAvailable={dataSourcesAvailable}>
          <div className="query-source-alerts-icon">
            <WarningFilledIcon />
          </div>
          {message}
        </DynamicComponent>
      </Card>
    </div>
  );
}

QuerySourceAlerts.propTypes = {
  query: PropTypes.object.isRequired,
  dataSourcesAvailable: PropTypes.bool,
};

QuerySourceAlerts.defaultProps = {
  dataSourcesAvailable: false,
};
