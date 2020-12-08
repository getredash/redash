import { isFunction, has } from "lodash";
import React from "react";
import cx from "classnames";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
import TimeAgo from "@/components/TimeAgo";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import { IMG_ROOT } from "@/services/data-source";

import "./QueryMetadata.less";

type OwnProps = {
    layout?: "table" | "horizontal";
    query: {
        // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
        created_at: string | Moment;
        // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
        updated_at: string | Moment;
        user: {
            name: string;
            profile_image_url: string;
            is_disabled?: boolean;
        };
        last_modified_by: {
            name: string;
            profile_image_url: string;
            is_disabled?: boolean;
        };
        schedule?: any;
    };
    dataSource?: {
        type?: string;
        name?: string;
    };
    onEditSchedule?: (...args: any[]) => any;
};

type Props = OwnProps & typeof QueryMetadata.defaultProps;

export default function QueryMetadata({ query, dataSource, layout, onEditSchedule }: Props) {
  return (
    <div className={`query-metadata query-metadata-${layout}`}>
      <div className="query-metadata-item">
        {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type 'never'. */}
        <img className="profile__image_thumb" src={query.user.profile_image_url} alt="Avatar" />
        <div className="query-metadata-property">
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type 'never'. */}
          <strong className={cx("query-metadata-label", { "text-muted": query.user.is_disabled })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type 'never'. */}
            {query.user.name}
          </strong>
          <span className="query-metadata-value">
            created{" "}
            <strong>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'created_at' does not exist on type 'neve... Remove this comment to see the full error message */}
              <TimeAgo date={query.created_at} />
            </strong>
          </span>
        </div>
      </div>
      <div className="query-metadata-item">
        {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'last_modified_by' does not exist on type... Remove this comment to see the full error message */}
        <img className="profile__image_thumb" src={query.last_modified_by.profile_image_url} alt="Avatar" />
        <div className="query-metadata-property">
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'last_modified_by' does not exist on type... Remove this comment to see the full error message */}
          <strong className={cx("query-metadata-label", { "text-muted": query.last_modified_by.is_disabled })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'last_modified_by' does not exist on type... Remove this comment to see the full error message */}
            {query.last_modified_by.name}
          </strong>
          <span className="query-metadata-value">
            updated{" "}
            <strong>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'updated_at' does not exist on type 'neve... Remove this comment to see the full error message */}
              <TimeAgo date={query.updated_at} />
            </strong>
          </span>
        </div>
      </div>
      <div className="query-metadata-space" />
      {has(dataSource, "name") && has(dataSource, "type") && (
        <div className="query-metadata-item">
          Data Source:
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'never'. */}
          <img src={`${IMG_ROOT}/${dataSource.type}.png`} width="20" alt={dataSource.type} />
          <div className="query-metadata-property">
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'. */}
            <div className="query-metadata-label">{dataSource.name}</div>
          </div>
        </div>
      )}
      <div className="query-metadata-item">
        <div className="query-metadata-property">
          <span className="query-metadata-label">
            <span className="zmdi zmdi-refresh m-r-5" />
            Refresh Schedule
          </span>
          <span className="query-metadata-value">
            <SchedulePhrase
              isLink={isFunction(onEditSchedule)}
              // @ts-expect-error ts-migrate(2339) FIXME: Property 'isNew' does not exist on type 'never'.
              isNew={query.isNew()}
              // @ts-expect-error ts-migrate(2339) FIXME: Property 'schedule' does not exist on type 'never'... Remove this comment to see the full error message
              schedule={query.schedule}
              onClick={onEditSchedule}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

QueryMetadata.defaultProps = {
  layout: "table",
  dataSource: null,
  onEditSchedule: null,
};
