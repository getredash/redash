import { includes } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import Timer from "@/components/Timer";

export default function QueryExecutionStatus({ status, updatedAt, error, isCancelling, onCancel }) {
  const alertType = status === "failed" ? "error" : "info";
  const showTimer = status !== "failed" && updatedAt;
  const isCancelButtonAvailable = includes(["waiting", "processing"], status);
  let message = isCancelling ? <React.Fragment>Cancelling&hellip;</React.Fragment> : null;

  switch (status) {
    case "waiting":
      if (!isCancelling) {
        message = <React.Fragment>Query in queue&hellip;</React.Fragment>;
      }
      break;
    case "processing":
      if (!isCancelling) {
        message = <React.Fragment>Executing query&hellip;</React.Fragment>;
      }
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
            {message} {showTimer && <Timer from={updatedAt} />}
          </div>
          <div>
            {isCancelButtonAvailable && (
              <Button type="primary" size="small" disabled={isCancelling} onClick={onCancel}>
                Cancel
              </Button>
            )}
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
  isCancelling: PropTypes.bool,
  onCancel: PropTypes.func,
};

QueryExecutionStatus.defaultProps = {
  status: "waiting",
  updatedAt: null,
  error: null,
  isCancelling: true,
  onCancel: () => {},
};
