import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import DatePicker from 'antd/lib/date-picker';
import { range, padStart } from 'lodash';
import moment from 'moment';
import { secondsToInterval, intervalToSeconds, IntervalEnum } from '@/filters';

import './ScheduleDialog.css';

const WEEKDAYS_SHORT = moment.weekdaysShort();
const WEEKDAYS_FULL = moment.weekdays();
const INTERVAL_OPTIONS_MAP = {
  [IntervalEnum.NEVER]: 1,
  [IntervalEnum.MINUTES]: 60,
  [IntervalEnum.HOURS]: 24,
  [IntervalEnum.DAYS]: 7,
  [IntervalEnum.WEEKS]: 5,
};

const HOUR_OPTIONS = range(0, 24).map(x => padStart(x, 2, '0')); // [00, 01, 02, ..]
const MINUTE_OPTIONS = range(0, 60, 5).map(x => padStart(x, 2, '0')); // [00, 05, 10, ..]
const DATE_FORMAT = 'YYYY-MM-DD';
const HOUR_FORMAT = 'HH:mm';

function localizeTime(time) {
  const [hrs, mins] = time.split(':');
  return moment
    .utc()
    .hour(hrs)
    .minute(mins)
    .local()
    .format(HOUR_FORMAT);
}

class ScheduleDialog extends React.Component {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    query: PropTypes.object.isRequired,
    refreshOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
    updateQuery: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    const { time, interval: secs, day_of_week: day } = props.query.schedule;
    const interval = secs ? secondsToInterval(secs) : {};
    const [hour, minute] = time ? localizeTime(time).split(':') : [null, null];

    this.state = {
      hour,
      minute,
      count: interval.count ? String(interval.count) : '1',
      interval: interval.interval || IntervalEnum.NEVER,
      dayOfWeek: day ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(day)] : null,
    };
  }

  get counts() {
    return range(1, INTERVAL_OPTIONS_MAP[this.state.interval]);
  }

  get intervals() {
    const ret = this.props.refreshOptions
      .map((seconds) => {
        const { count, interval } = secondsToInterval(seconds);
        return count === 1 ? {
          name: interval,
          time: seconds,
        } : null;
      })
      .filter(x => x !== null);
    ret.unshift({ name: IntervalEnum.NEVER });

    Object.defineProperty(this, 'intervals', { value: ret }); // memoize

    return ret;
  }

  set newSchedule(newProps) {
    this.props.updateQuery({
      schedule: Object.assign({}, this.props.query.schedule, newProps),
    });
  }

  setTime = (h, m) => {
    this.newSchedule = {
      time:
        h && m
          ? moment()
            .hour(h)
            .minute(m)
            .utc()
            .format(HOUR_FORMAT)
          : null,
    };

    this.setState({
      hour: h,
      minute: m,
    });
  };

  setInterval = (e) => {
    const newInterval = e.target.value;
    const newSchedule = Object.assign({}, this.props.query.schedule);

    // resets to defaults
    if (newInterval === IntervalEnum.NEVER) {
      newSchedule.until = null;
    }
    if ([IntervalEnum.NEVER, IntervalEnum.MINUTES, IntervalEnum.HOURS].indexOf(newInterval) !== -1) {
      newSchedule.time = null;
    }
    if (newInterval !== IntervalEnum.WEEKS) {
      newSchedule.day_of_week = null;
    }
    if (
      (newInterval === IntervalEnum.DAYS || newInterval === IntervalEnum.WEEKS) &&
      (!this.state.minute || !this.state.hour)
    ) {
      newSchedule.time = moment()
        .hour('00')
        .minute('15')
        .utc()
        .format(HOUR_FORMAT);
    }
    if (newInterval === IntervalEnum.WEEKS && !this.state.dayOfWeek) {
      newSchedule.day_of_week = WEEKDAYS_FULL[0];
    }

    newSchedule.interval = newInterval
      ? intervalToSeconds(Number(this.state.count), newInterval)
      : null;

    const [hour, minute] = newSchedule.time ?
      localizeTime(newSchedule.time).split(':')
      : [null, null];

    this.setState({
      interval: newInterval,
      count: newInterval !== IntervalEnum.NEVER ? this.state.count : '1',
      hour,
      minute,
      dayOfWeek: newSchedule.day_of_week
        ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(newSchedule.day_of_week)]
        : null,
    });

    this.newSchedule = newSchedule;
  };

  setCount = (e) => {
    const newCount = e.target.value;
    const totalSeconds = intervalToSeconds(parseInt(newCount, 10), this.state.interval);
    this.setState({ count: newCount });
    this.newSchedule = { interval: totalSeconds };
  };

  setScheduleUntil = (momentDate, date) => {
    this.newSchedule = { until: date };
  };

  setWeekday = (e) => {
    const dayOfWeek = e.target.value;
    this.setState({ dayOfWeek });
    this.newSchedule = {
      day_of_week: dayOfWeek ? WEEKDAYS_FULL[WEEKDAYS_SHORT.indexOf(dayOfWeek)] : null,
    };
  };

  render() {
    const {
      interval, minute, hour, until, count,
    } = this.state;

    return (
      <Modal
        title="Refresh Schedule"
        className="schedule"
        visible={this.props.show}
        onCancel={this.props.onClose}
        footer={null}
      >
        <div className="schedule-component">
          <div>Refresh every</div>
          {interval !== IntervalEnum.NEVER ? (
            <select value={count} onChange={this.setCount}>
              {this.counts.map(cnt => (
                <option value={String(cnt)} key={cnt}>{cnt}</option>
              ))}
            </select>
          ) : null}
          <select value={interval} onChange={this.setInterval}>
            {this.intervals.map(iv => (
              <option value={iv.name} key={iv.name}>{iv.name}</option>
            ))}
          </select>
        </div>
        {[IntervalEnum.DAYS, IntervalEnum.WEEKS].indexOf(interval) !== -1 ? (
          <div className="schedule-component">
            <div>At the following time</div>
            <select value={hour} onChange={e => this.setTime(e.target.value, minute)}>
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select value={minute} onChange={e => this.setTime(hour, e.target.value)}>
              {MINUTE_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        ) : null}
        {IntervalEnum.WEEKS === interval ? (
          <div className="btn-toolbar schedule-component">
            <div className="btn-group" data-toggle="buttons">
              {WEEKDAYS_SHORT.map(day => (
                <button
                  className={`btn btn-xs btn-default${this.state.dayOfWeek === day ? ' active' : ''}`}
                  onClick={this.setWeekday}
                  key={day}
                  value={day}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {interval ? (
          <div className="schedule-component">
            <div>Stop refresh on:</div>
            <DatePicker
              format={DATE_FORMAT}
              placeholder={until || 'Select Date'}
              onChange={this.setScheduleUntil}
            />
          </div>
        ) : null}
      </Modal>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('scheduleDialog', react2angular(ScheduleDialog));
}

init.init = true;
