import React from "react";
import PropTypes from "prop-types";
import Card from "antd/lib/card";
import Icon from "antd/lib/icon";
import Button from "antd/lib/button";
import Typography from "antd/lib/typography";
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
            You can either <a href="queries">browse existing queries</a>, or ask for additional permissions from your
            Redash admin.
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
            <Button type="primary" href="data_sources/new">
              Create Data Source
            </Button>
            <Button type="default" href="groups">
              Manage Group Permissions
            </Button>
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
        <div className="query-source-alerts-icon">
          <Icon type="warning" theme="filled" />
        </div>
        {message}
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
