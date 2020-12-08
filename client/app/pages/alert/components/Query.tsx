import React from "react";

import Link from "@/components/Link";
import QuerySelector from "@/components/QuerySelector";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import { Query as QueryType } from "@/components/proptypes";

import Tooltip from "antd/lib/tooltip";

import WarningFilledIcon from "@ant-design/icons/WarningFilled";
import QuestionCircleTwoToneIcon from "@ant-design/icons/QuestionCircleTwoTone";
import LoadingOutlinedIcon from "@ant-design/icons/LoadingOutlined";

import "./Query.less";

type OwnProps = {
    query?: QueryType;
    queryResult?: any;
    onChange?: (...args: any[]) => any;
    editMode?: boolean;
};

type Props = OwnProps & typeof QueryFormItem.defaultProps;

export default function QueryFormItem({ query, queryResult, onChange, editMode }: Props) {
  const queryHint =
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'schedule' does not exist on type 'never'... Remove this comment to see the full error message
    query && query.schedule ? (
      <small>
        Scheduled to refresh{" "}
        <i className="alert-query-schedule">
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'schedule' does not exist on type 'never'... Remove this comment to see the full error message */}
          <SchedulePhrase schedule={query.schedule} isNew={false} />
        </i>
      </small>
    ) : (
      <small>
        <WarningFilledIcon className="warning-icon-danger" /> This query has no <i>refresh schedule</i>.{" "}
        <Tooltip title="A query schedule is not necessary but is highly recommended for alerts. An Alert without a query schedule will only send notifications if a user in your organization manually executes this query.">
          <a>
            Why it&apos;s recommended <QuestionCircleTwoToneIcon />
          </a>
        </Tooltip>
      </small>
    );

  return (
    <>
      {editMode ? (
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
        <QuerySelector onChange={onChange} selectedQuery={query} className="alert-query-selector" type="select" />
      ) : (
        <Tooltip title="Open query in a new tab.">
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'. */}
          <Link href={`queries/${query.id}`} target="_blank" rel="noopener noreferrer" className="alert-query-link">
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'. */}
            {query.name}
            <i className="fa fa-external-link" />
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

QueryFormItem.defaultProps = {
  query: null,
  queryResult: null,
  onChange: () => {},
  editMode: false,
};
