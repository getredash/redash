import React, { useMemo, useState, useEffect } from "react";
import moment from "moment";
import PropTypes from "prop-types";
import { Moment } from "@/components/proptypes";

export default function Timer({ from }) {
  const startTime = useMemo(() => moment(from).valueOf(), [from]);
  const [value, setValue] = useState(null);

  useEffect(() => {
    function update() {
      const diff = moment.now() - startTime;
      const format = diff > 1000 * 60 * 60 ? "HH:mm:ss" : "mm:ss"; // no HH under an hour
      setValue(moment.utc(diff).format(format));
    }
    update();

    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="rd-timer">{value}</span>;
}

Timer.propTypes = {
  from: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date), Moment]),
};

Timer.defaultProps = {
  from: null,
};
