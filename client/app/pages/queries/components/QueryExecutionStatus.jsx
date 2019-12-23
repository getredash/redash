import { includes } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import { Timer } from "@/components/Timer";

export default function QueryExecutionStatus({ status, updatedAt, error, onCancel }) {
  const alertType = status === "failed" ? "error" : "info";
  const showTimer = status !== "failed" && updatedAt;
  const canCancel = includes(["waiting", "processing"], status);
  let message = null;

  switch (status) {
    case "waiting":
      message = <React.Fragment>Query in queue&hellip;</React.Fragment>;
      break;
    case "processing":
      message = <React.Fragment>Executing query&hellip;</React.Fragment>;
      break;
    case "loading-result":
      message = <React.Fragment>Loading results&hellip;</React.Fragment>;
      break;
    case "failed":
      message = (
        <React.Fragment>
          Error running query: <strong>{error}</strong>
        </React.Fragment>
      );
      break;
    // no default
  }

  return (
    <Alert
      type={alertType}
      message={
        <div className="d-flex align-items-center">
          <div className="flex-fill">
            {message}{" "}
            {showTimer && <Timer from={updatedAt} />}
          </div>
          <div>
            {canCancel && <Button type="primary" size="small" onClick={onCancel}>Cancel</Button>}
          </div>
        </div>
      }
    />
  );
}

QueryExecutionStatus.propTypes = {
  status: PropTypes.string,
  updatedAt: PropTypes.any,
  error: PropTypes.string,
  onCancel: PropTypes.func,
};

QueryExecutionStatus.defaultProps = {
  status: "waiting",
  updatedAt: null,
  error: null,
  onCancel: () => {},
};
