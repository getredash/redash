import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import PropTypes from "prop-types";
import { Dayjs } from "@/components/proptypes";
dayjs.extend(utc);

export default function Timer({ from }) {
  const startTime = useMemo(() => dayjs(from).valueOf(), [from]);
  const [value, setValue] = useState(null);

  useEffect(() => {
    function update() {
      const diff = dayjs() - startTime;
      const format = diff > 1000 * 60 * 60 ? "HH:mm:ss" : "mm:ss"; // no HH under an hour
      setValue(dayjs.utc(diff).format(format));
    }
    update();

    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="rd-timer">{value}</span>;
}

Timer.propTypes = {
  from: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date), Dayjs]),
};

Timer.defaultProps = {
  from: null,
};
