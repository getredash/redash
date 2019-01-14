import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import { localizeTime, durationHumanize } from '@/filters';

import './ScheduleDialog.css';

class SchedulePhrase extends React.Component {
  static propTypes = {
    schedule: PropTypes.shape({
      interval: PropTypes.number,
      time: PropTypes.string,
      day_of_week: PropTypes.string,
    }),
    isNew: PropTypes.bool.isRequired,
    isLink: PropTypes.bool,
  };

  static defaultProps = {
    schedule: {
      interval: null,
      time: null,
      day_of_week: null,
    },
    isLink: false,
  };

  get content() {
    const { interval: seconds } = this.propsSchedule;
    if (!seconds) {
      return ['Never'];
    }
    const humanized = durationHumanize(seconds, {
      omitSingleValueNumber: true,
    });
    const short = `Every ${humanized}`;
    let full = `Refreshes every ${humanized}`;

    const { time, day_of_week: dayOfWeek } = this.props.schedule;
    if (time) {
      full += ` at ${localizeTime(time)}`;
    }
    if (dayOfWeek) {
      full += ` on ${dayOfWeek}`;
    }

    return [short, full];
  }

  get propsSchedule() {
    return this.props.schedule || this.constructor.defaultProps.schedule;
  }

  render() {
    if (this.props.isNew) {
      return 'Never';
    }

    const [short, full] = this.content;
    const content = full ? <Tooltip title={full}>{short}</Tooltip> : short;

    return this.props.isLink
      ? <a className="schedule-phrase">{content}</a>
      : content;
  }
}

export default function init(ngModule) {
  ngModule.component('schedulePhrase', react2angular(SchedulePhrase));
}

init.init = true;
