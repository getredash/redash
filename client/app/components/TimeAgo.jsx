import moment from "moment";
import { isNil } from "lodash";
import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Moment } from "@/components/proptypes";
import { clientConfig } from "@/services/auth";
import useForceUpdate from "@/lib/hooks/useForceUpdate";
import Tooltip from "antd/lib/tooltip";

function toMoment(value) {
  value = !isNil(value) ? moment(value) : null;
  return value && value.isValid() ? value : null;
}

export default function TimeAgo({ date, placeholder, autoUpdate }) {
  const startDate = toMoment(date);

  const value = startDate ? startDate.fromNow() : placeholder;
  const title = startDate ? startDate.format(clientConfig.dateTimeFormat) : "";

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (autoUpdate) {
      const timer = setInterval(forceUpdate, 30 * 1000);
      return () => clearInterval(timer);
    }
  }, [autoUpdate, forceUpdate]);

  return (
    <Tooltip title={title}>
      <span data-test="TimeAgo">{value}</span>
    </Tooltip>
  );
}

TimeAgo.propTypes = {
  // `date` and `placeholder` used in `getDerivedStateFromProps`
  // eslint-disable-next-line react/no-unused-prop-types
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date), Moment]),
  // eslint-disable-next-line react/no-unused-prop-types
  placeholder: PropTypes.string,
  autoUpdate: PropTypes.bool,
};

TimeAgo.defaultProps = {
  date: null,
  placeholder: "",
  autoUpdate: true,
};
