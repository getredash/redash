import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import { localizeTime, durationHumanize } from '@/filters';

import './ScheduleDialog.css';

class SchedulePhrase extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    schedule: PropTypes.object.isRequired,
    isNew: PropTypes.bool.isRequired,
    isLink: PropTypes.bool,
  };

  static defaultProps = {
    isLink: false,
  };

  get content() {
    const { interval: seconds } = this.props.schedule;
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
