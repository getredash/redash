import moment from 'moment';
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Moment } from '@/components/proptypes';

const interactiveComponents = new Set();

function updateInteractiveComponents() {
  interactiveComponents.forEach(component => component.forceUpdate());
  setTimeout(updateInteractiveComponents, 3000);
}
updateInteractiveComponents();

export class TimeAgo extends React.Component {
  static propTypes = {
    date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
      Moment,
    ]),
    interactive: PropTypes.bool,
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    date: null,
    interactive: true,
    placeholder: '',
  };

  constructor(props) {
    super(props);
    this._value = moment(this.props.date);
  }

  componentDidMount() {
    if (this.props.interactive) {
      interactiveComponents.add(this);
    }
  }

  shouldComponentUpdate(nextProps) {
    this._value = moment(nextProps.date);
    if (nextProps.interactive) {
      interactiveComponents.add(this);
    } else {
      interactiveComponents.delete(this);
    }
    return true; // default behaviour
  }

  componentWillUnmount() {
    interactiveComponents.delete(this);
  }

  render() {
    return this._value.isValid() ? this._value.fromNow() : this.props.placeholder;
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
