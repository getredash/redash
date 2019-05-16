import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

export class DateTimeInput extends React.Component {
  static propTypes = {
    value: Moment,
    withSeconds: PropTypes.bool,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    value: null,
    withSeconds: false,
    onSelect: () => {},
    className: '',
  };

  constructor(props) {
    super(props);
    const { value } = props;
    this.state = { currentValue: value && value.isValid() ? value : null, open: false };
  }

  render() {
    const { withSeconds, onSelect, className } = this.props;
    const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
      (withSeconds ? ' HH:mm:ss' : ' HH:mm');

    return (
      <DatePicker
        className={className}
        showTime
        value={this.state.currentValue}
        format={format}
        placeholder="Select Date and Time"
        onChange={newValue => this.setState({ currentValue: newValue })}
        onOpenChange={(status) => {
          this.setState({ open: status }, () => {
            const { open, currentValue } = this.state;
            if (!open) { // on close picker
              if (currentValue && currentValue.isValid()) {
                onSelect(currentValue);
              }
            }
          });
        }}
      />
    );
  }
}

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput));
}

init.init = true;
