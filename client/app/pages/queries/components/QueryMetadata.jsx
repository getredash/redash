import { isFunction } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { TimeAgo } from "@/components/TimeAgo";
import { SchedulePhrase } from "@/components/queries/SchedulePhrase";

import "./QueryMetadata.less";

export default function QueryMetadata({ query, layout, onEditSchedule }) {
  return (
    <div className={`query-metadata-new query-metadata-${layout}`}>
      <div className="query-metadata-item">
        <img className="profile__image_thumb" src={query.user.profile_image_url} alt="Avatar" />
        <div className="query-metadata-property">
          <strong className={cx("query-metadata-label", { "text-muted": query.user.is_disabled })}>
            {query.user.name}
          </strong>
          <span className="query-metadata-value">
            created{" "}
            <strong>
              <TimeAgo date={query.created_at} />
            </strong>
          </span>
        </div>
      </div>
      <div className="query-metadata-item">
        <img className="profile__image_thumb" src={query.last_modified_by.profile_image_url} alt="Avatar" />
        <div className="query-metadata-property">
          <strong className={cx("query-metadata-label", { "text-muted": query.last_modified_by.is_disabled })}>
            {query.last_modified_by.name}
          </strong>
          <span className="query-metadata-value">
            updated{" "}
            <strong>
              <TimeAgo date={query.updated_at} />
            </strong>
          </span>
        </div>
      </div>
      <div className="query-metadata-item">
        <div className="query-metadata-property">
          <span className="query-metadata-label">
            <span className="zmdi zmdi-refresh m-r-5" />
            Refresh Schedule
          </span>
          <span className="query-metadata-value">
            <SchedulePhrase
              isLink={isFunction(onEditSchedule)}
              isNew={query.isNew()}
              schedule={query.schedule}
              onClick={onEditSchedule}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

QueryMetadata.propTypes = {
  layout: PropTypes.oneOf(["table", "horizontal"]),
  query: PropTypes.shape({
    created_at: PropTypes.any, // string or Moment instance
    updated_at: PropTypes.any, // string or Moment instance
    user: PropTypes.shape({
      name: PropTypes.string,
      profile_image_url: PropTypes.string,
      is_disabled: PropTypes.bool,
    }),
    last_modified_by: PropTypes.shape({
      name: PropTypes.string,
      profile_image_url: PropTypes.string,
      is_disabled: PropTypes.bool,
    }),
    schedule: PropTypes.object,
  }).isRequired,
  onEditSchedule: PropTypes.func,
};

QueryMetadata.defaultProps = {
  layout: "table",
  onEditSchedule: null,
};
