import moment from 'moment';
import { useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { Moment } from '@/components/proptypes';
import useForceUpdate from '@/lib/hooks/useForceUpdate';

export function Timer({ from }) {
  const startTime = useMemo(() => moment(from).valueOf(), [from]);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const timer = setInterval(forceUpdate, 1000);
    return () => clearInterval(timer);
  }, []);

  return moment.utc(moment.now() - startTime).format('HH:mm:ss');
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
