import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CorneliusJs = global.Cornelius;

export default function Cornelius({ initialDate, data, timeInterval }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (container) {
      CorneliusJs.draw({
        initialDate,
        container,
        cohort: data,
        title: null,
        timeInterval,
        labels: {
          time: 'Time',
          people: 'Users',
          weekOf: 'Week of',
        },
      });
    }
  }, [container, initialDate, data, timeInterval]);

  return <div ref={setContainer} />;
}

Cornelius.propTypes = {
  initialDate: PropTypes.instanceOf(Date).isRequired,
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  timeInterval: PropTypes.oneOf(['daily', 'weekly', 'monthly']),
};

Cornelius.defaultProps = {
  timeInterval: 'daily',
};
