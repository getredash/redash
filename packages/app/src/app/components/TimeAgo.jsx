import moment from "moment";
import { isNil } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Moment } from "@/components/proptypes";
import { clientConfig } from "@/services/auth";
import Tooltip from "@/components/Tooltip";

function toMoment(value) {
  value = !isNil(value) ? moment(value) : null;
  return value && value.isValid() ? value : null;
}

export default function TimeAgo({ date, placeholder, autoUpdate, variation }) {
  const startDate = toMoment(date);
  const [value, setValue] = useState(null);
  const title = useMemo(() => (startDate ? startDate.format(clientConfig.dateTimeFormat) : null), [startDate]);

  useEffect(() => {
    function update() {
      setValue(startDate ? startDate.fromNow() : placeholder);
    }
    update();

    if (autoUpdate) {
      const timer = setInterval(update, 30 * 1000);
      return () => clearInterval(timer);
    }
  }, [autoUpdate, startDate, placeholder]);

  if (variation === "timeAgoInTooltip") {
    return (
      <Tooltip title={value}>
        <span data-test="TimeAgo">{title}</span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={title}>
      <span data-test="TimeAgo">{value}</span>
    </Tooltip>
  );
}

TimeAgo.propTypes = {
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date), Moment]),
  placeholder: PropTypes.string,
  autoUpdate: PropTypes.bool,
  variation: PropTypes.oneOf(["timeAgoInTooltip"]),
};

TimeAgo.defaultProps = {
  date: null,
  placeholder: "",
  autoUpdate: true,
};
