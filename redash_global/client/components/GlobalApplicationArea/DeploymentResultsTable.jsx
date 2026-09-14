import React from "react";
import PropTypes from "prop-types";
import Table from "antd/lib/table";

const columns = [
  { title: "Organization", dataIndex: "organization_name", key: "organization_name" },
  { title: "Slug", dataIndex: "organization_slug", key: "organization_slug" },
  {
    title: "Result",
    key: "errors",
    render: (text, result) =>
      result.errors.length === 0 ? (
        "No problems reported"
      ) : (
        <ul className="p-l-15 m-b-0">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ),
  },
];

export default function DeploymentResultsTable({ results }) {
  return <Table rowKey="organization_id" columns={columns} dataSource={results} pagination={false} size="small" />;
}

DeploymentResultsTable.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
};
