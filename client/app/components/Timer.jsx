import React, { useMemo, useEffect } from "react";
import moment from "moment";
import PropTypes from "prop-types";
import { Moment } from "@/components/proptypes";
import useForceUpdate from "@/lib/hooks/useForceUpdate";

export default function Timer({ from }) {
  const startTime = useMemo(() => moment(from).valueOf(), [from]);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const timer = setInterval(forceUpdate, 1000);
    return () => clearInterval(timer);
  }, [forceUpdate]);

  const diff = moment.now() - startTime;
  const format = diff > 1000 * 60 * 60 ? "HH:mm:ss" : "mm:ss"; // no HH under an hour

  return <span className="rd-timer">{moment.utc(diff).format(format)}</span>;
}

Timer.propTypes = {
  from: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date), Moment]),
};

Timer.defaultProps = {
  from: null,
};
