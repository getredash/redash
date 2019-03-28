import moment from 'moment';
import { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { Moment } from '@/components/proptypes';

function timeFrom(startTime) {
  return moment.utc(moment.now() - startTime).format('HH:mm:ss');
}

export function Timer({ from }) {
  const startTime = useMemo(() => moment(from).valueOf(), [from]);
  const [currentTime, setCurrentTime] = useState(timeFrom(startTime));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(timeFrom(startTime)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return currentTime;
}

Timer.propTypes = {
  from: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
    Moment,
  ]),
};

Timer.defaultProps = {
  from: null,
};

export default function init(ngModule) {
  ngModule.component('rdTimer', react2angular(Timer));
}

init.init = true;
