import React from "react";
import PropTypes from "prop-types";

import Link from "@/components/Link";
import QuerySelector from "@/components/QuerySelector";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import { Query as QueryType } from "@/components/proptypes";

import Tooltip from "@/components/Tooltip";

import WarningFilledIcon from "@ant-design/icons/WarningFilled";
import QuestionCircleTwoToneIcon from "@ant-design/icons/QuestionCircleTwoTone";
import LoadingOutlinedIcon from "@ant-design/icons/LoadingOutlined";

import "./Query.less";

export default function QueryFormItem({ query, queryResult, onChange, editMode }) {
  const queryHint =
    query && query.schedule ? (
      <small>
        Scheduled to refresh{" "}
        <i className="alert-query-schedule">
          <SchedulePhrase schedule={query.schedule} isNew={false} />
        </i>
      </small>
    ) : (
      <small>
        <WarningFilledIcon className="warning-icon-danger" /> This query has no <i>refresh schedule</i>.{" "}
        <Tooltip title="A query schedule is not necessary but is highly recommended for alerts. An Alert without a query schedule will only send notifications if a user in your organization manually executes this query.">
          <a role="presentation">
            Why it&apos;s recommended <QuestionCircleTwoToneIcon />
          </a>
        </Tooltip>
      </small>
    );

  return (
    <>
      {editMode ? (
        <QuerySelector onChange={onChange} selectedQuery={query} className="alert-query-selector" type="select" />
      ) : (
        <Tooltip title="Open query in a new tab.">
          <Link href={`queries/${query.id}`} target="_blank" rel="noopener noreferrer" className="alert-query-link">
            {query.name} <i className="fa fa-external-link" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        </Tooltip>
      )}
      <div className="ant-form-item-explain">{query && queryHint}</div>
      {query && !queryResult && (
        <div className="m-t-30">
          <LoadingOutlinedIcon className="m-r-5" /> Loading query data
        </div>
      )}
    </>
  );
}

QueryFormItem.propTypes = {
  query: QueryType,
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onChange: PropTypes.func,
  editMode: PropTypes.bool,
};

QueryFormItem.defaultProps = {
  query: null,
  queryResult: null,
  onChange: () => {},
  editMode: false,
};
