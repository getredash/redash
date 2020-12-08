import React, { useMemo, useState, useEffect } from "react";
import moment from "moment";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    from?: string | number | any | Moment;
};

type Props = OwnProps & typeof Timer.defaultProps;

export default function Timer({ from }: Props) {
  const startTime = useMemo(() => moment(from).valueOf(), [from]);
  const [value, setValue] = useState(null);

  useEffect(() => {
    function update() {
      const diff = moment.now() - startTime;
      const format = diff > 1000 * 60 * 60 ? "HH:mm:ss" : "mm:ss"; // no HH under an hour
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      setValue(moment.utc(diff).format(format));
    }
    update();

    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="rd-timer">{value}</span>;
}

Timer.defaultProps = {
  from: null,
};
