import moment from 'moment';
import { isNil } from 'lodash';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Moment } from '@/components/proptypes';
import { clientConfig } from '@/services/auth';

function getTimeAgo(date, placeholder) {
  // if `date` prop is not empty and a valid date/time - convert it to `moment`
  date = !isNil(date) ? moment(date) : null;
  date = date && date.isValid() ? date : null;

  return {
    value: date ? date.fromNow() : placeholder,
    title: date ? date.format(clientConfig.dateTimeFormat) : '',
  };
}

function useForceUpdate() {
  const [, setValue] = useState(false);
  return () => setValue(value => !value);
}

export function TimeAgo({ date, placeholder, autoUpdate }) {
  const { value, title } = getTimeAgo(date, placeholder);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (autoUpdate) {
      const timer = setInterval(forceUpdate, 30 * 1000);
      return () => clearInterval(timer);
    }
  }, [autoUpdate]);

  return <span title={title} data-test="TimeAgo">{value}</span>;
}

TimeAgo.propTypes = {
  // `date` and `placeholder` used in `getDerivedStateFromProps`
  // eslint-disable-next-line react/no-unused-prop-types
  date: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
    Moment,
  ]),
  // eslint-disable-next-line react/no-unused-prop-types
  placeholder: PropTypes.string,
  autoUpdate: PropTypes.bool,
};

TimeAgo.defaultProps = {
  date: null,
  placeholder: '',
  autoUpdate: true,
};

export default function init(ngModule) {
  ngModule.directive('amTimeAgo', () => ({
    link($scope, $element, attr) {
      const modelName = attr.amTimeAgo;
      $scope.$watch(modelName, (value) => {
        ReactDOM.render(<TimeAgo date={value} />, $element[0]);
      });

      $scope.$on('$destroy', () => {
        ReactDOM.unmountComponentAtNode($element[0]);
      });
    },
  }));

  ngModule.component('rdTimeAgo', {
    bindings: {
      value: '=',
    },
    controller($scope, $element) {
      $scope.$watch('$ctrl.value', () => {
        // Initial render will occur here as well
        ReactDOM.render(<TimeAgo date={this.value} placeholder="-" />, $element[0]);
      });

      $scope.$on('$destroy', () => {
        ReactDOM.unmountComponentAtNode($element[0]);
      });
    },
  });
}

init.init = true;
