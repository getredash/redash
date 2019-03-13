import moment from 'moment';
import { isNil } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Moment } from '@/components/proptypes';
import { clientConfig } from '@/services/auth';

const autoUpdateList = new Set();

function updateComponents() {
  autoUpdateList.forEach(component => component.update());
  setTimeout(updateComponents, 30 * 1000);
}
updateComponents();

export class TimeAgo extends React.PureComponent {
  static propTypes = {
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

  static defaultProps = {
    date: null,
    placeholder: '',
    autoUpdate: true,
  };

  // Initial state, to get rid of React warning
  state = {
    title: null,
    value: null,
  };

  static getDerivedStateFromProps({ date, placeholder }) {
    // if `date` prop is not empty and a valid date/time - convert it to `moment`
    date = !isNil(date) ? moment(date) : null;
    date = date && date.isValid() ? date : null;

    return {
      value: date ? date.fromNow() : placeholder,
      title: date ? date.format(clientConfig.dateTimeFormat) : '',
    };
  }

  componentDidMount() {
    autoUpdateList.add(this);
    this.update(true);
  }

  componentWillUnmount() {
    autoUpdateList.delete(this);
  }

  update(force = false) {
    if (force || this.props.autoUpdate) {
      this.setState(this.constructor.getDerivedStateFromProps(this.props));
    }
  }

  render() {
    return <span title={this.state.title} data-test="TimeAgo">{this.state.value}</span>;
  }
}

export default function init(ngModule) {
  ngModule.directive('amTimeAgo', () => ({
    link($scope, element, attr) {
      const modelName = attr.amTimeAgo;
      $scope.$watch(modelName, (value) => {
        ReactDOM.render(<TimeAgo date={value} />, element[0]);
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
    },
  });
}

init.init = true;
