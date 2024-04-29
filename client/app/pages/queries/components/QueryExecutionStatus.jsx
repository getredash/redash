import React from "react";
import PropTypes from "prop-types";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import Timer from "@/components/Timer";
import { ExecutionStatus } from "@/services/query-result";

export default function QueryExecutionStatus({ status, updatedAt, error, isCancelling, onCancel }) {
  const alertType = status === ExecutionStatus.FAILED ? "error" : "info";
  const showTimer = status !== ExecutionStatus.FAILED && updatedAt;
  const isCancelButtonAvailable = [
    ExecutionStatus.SCHEDULED,
    ExecutionStatus.QUEUED,
    ExecutionStatus.STARTED,
    ExecutionStatus.DEFERRED,
  ].includes(status);
  let message = isCancelling ? <React.Fragment>Cancelling&hellip;</React.Fragment> : null;

  switch (status) {
    case ExecutionStatus.QUEUED:
      if (!isCancelling) {
        message = <React.Fragment>Query in queue&hellip;</React.Fragment>;
      }
      break;
    case ExecutionStatus.STARTED:
      if (!isCancelling) {
        message = <React.Fragment>Executing query&hellip;</React.Fragment>;
      }
      break;
    case ExecutionStatus.LOADING_RESULT:
      message = <React.Fragment>Loading results&hellip;</React.Fragment>;
      break;
    case ExecutionStatus.FAILED:
      message = (
        <React.Fragment>
          Error running query: <strong>{error}</strong>
        </React.Fragment>
      );
      break;
    case ExecutionStatus.CANCELED:
      message = <React.Fragment>Query was canceled</React.Fragment>;
      break;
    // no default
  }

  return (
    <Alert
      data-test="QueryExecutionStatus"
      type={alertType}
      message={
        <div className="d-flex align-items-center">
          <div className="flex-fill p-t-5 p-b-5">
            {message} {showTimer && <Timer from={updatedAt} />}
          </div>
          <div>
            {isCancelButtonAvailable && (
              <Button className="m-l-10" type="primary" size="small" disabled={isCancelling} onClick={onCancel}>
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
  status: ExecutionStatus.QUEUED,
  updatedAt: null,
  error: null,
  isCancelling: true,
  onCancel: () => {},
};
