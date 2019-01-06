import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import DatePicker from 'antd/lib/date-picker';
import TimePicker from 'antd/lib/time-picker';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import { range, clone, isEqual } from 'lodash';
import moment from 'moment';
import { secondsToInterval, intervalToSeconds, IntervalEnum, localizeTime } from '@/filters';

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

const DATE_FORMAT = 'YYYY-MM-DD';
const HOUR_FORMAT = 'HH:mm';
const Option = Select.Option;

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
    this.state = this.initState;
    this.modalRef = React.createRef(); // used by <Select>
  }

  get initState() {
    const newSchedule = clone(this.props.query.schedule);
    const { time, interval: secs, day_of_week: day } = newSchedule;
    const interval = secs ? secondsToInterval(secs) : {};
    const [hour, minute] = time ? localizeTime(time).split(':') : [null, null];

    return {
      hour,
      minute,
      count: interval.count ? String(interval.count) : '1',
      interval: interval.interval || IntervalEnum.NEVER,
      dayOfWeek: day ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(day)] : null,
      newSchedule,
    };
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
    this.setState({
      newSchedule: Object.assign(this.state.newSchedule, newProps),
    });
  }

  getCounts = interval => range(1, INTERVAL_OPTIONS_MAP[interval])

  setTime = (time) => {
    this.newSchedule = {
      time: moment(time).utc().format(HOUR_FORMAT),
    };
  };

  setInterval = (newInterval) => {
    const { newSchedule } = this.state;

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

    // reset count if out of new interval count range
    let count = this.state.count;
    if (this.getCounts(newInterval).indexOf(Number(count)) === -1) {
      count = '1';
    }

    newSchedule.interval = newInterval
      ? intervalToSeconds(Number(count), newInterval)
      : null;

    const [hour, minute] = newSchedule.time ?
      localizeTime(newSchedule.time).split(':')
      : [null, null];

    this.setState({
      interval: newInterval,
      count,
      hour,
      minute,
      dayOfWeek: newSchedule.day_of_week
        ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(newSchedule.day_of_week)]
        : null,
    });

    this.newSchedule = newSchedule;
  };

  setCount = (newCount) => {
    const totalSeconds = intervalToSeconds(parseInt(newCount, 10), this.state.interval);
    this.setState({ count: newCount });
    this.newSchedule = { interval: totalSeconds };
  };

  setScheduleUntil = (_, date) => {
    this.newSchedule = { until: date };
  };

  setWeekday = (e) => {
    const dayOfWeek = e.target.value;
    this.setState({ dayOfWeek });
    this.newSchedule = {
      day_of_week: dayOfWeek ? WEEKDAYS_FULL[WEEKDAYS_SHORT.indexOf(dayOfWeek)] : null,
    };
  };

  setUntilToggle = (e) => {
    const date = e.target.value ? moment().format(DATE_FORMAT) : null;
    this.setScheduleUntil(null, date);
  }

  save() {
    // save if changed
    if (!isEqual(this.state.newSchedule, this.props.query.schedule)) {
      this.props.updateQuery({ schedule: clone(this.state.newSchedule) });
    }
    this.props.onClose();
  }

  cancel() {
    // reset changes
    this.setState(this.initState);
    this.props.onClose();
  }

  render() {
    const {
      interval, minute, hour, count, newSchedule: { until },
    } = this.state;
    const fixZIndex = { getPopupContainer: () => this.modalRef.current };
    const selectProps = {
      ...fixZIndex,
      className: 'input',
      dropdownMatchSelectWidth: false,
    };

    return (
      <Modal
        title="Refresh Schedule"
        className="schedule"
        visible={this.props.show}
        onCancel={() => this.cancel()}
        onOk={() => this.save()}
      >
        <div className="schedule-component" ref={this.modalRef}>
          <h5>Refresh every</h5>
          <div>
            {interval !== IntervalEnum.NEVER ? (
              <Select value={count} onChange={this.setCount} {...selectProps}>
                {this.getCounts(this.state.interval).map(cnt => (
                  <Option value={String(cnt)} key={cnt}>{cnt}</Option>
                ))}
              </Select>
            ) : null}
            <Select value={interval} onChange={this.setInterval} {...selectProps}>
              {this.intervals.map(iv => (
                <Option value={iv.name} key={iv.name}>{iv.name}</Option>
              ))}
            </Select>
          </div>
        </div>
        {[IntervalEnum.DAYS, IntervalEnum.WEEKS].indexOf(interval) !== -1 ? (
          <div className="schedule-component">
            <h5>On time</h5>
            <div>
              <TimePicker
                allowEmpty={false}
                defaultValue={moment().hour(hour).minute(minute)}
                format={HOUR_FORMAT}
                minuteStep={5}
                onChange={this.setTime}
                {...fixZIndex}
              />
            </div>
          </div>
        ) : null}
        {IntervalEnum.WEEKS === interval ? (
          <div className="schedule-component">
            <h5>On day</h5>
            <Radio.Group
              size="medium"
              defaultValue={this.state.dayOfWeek}
              onChange={this.setWeekday}
            >
              {WEEKDAYS_SHORT.map(day => (
                <Radio.Button value={day} key={day} className="input">
                  {day[0]}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        ) : null}
        {interval !== IntervalEnum.NEVER ? (
          <div className="schedule-component">
            <h5>Ends</h5>
            <div className="ends">
              <Radio.Group
                size="medium"
                value={!!until}
                onChange={this.setUntilToggle}
              >
                <Radio value={false}>Never</Radio>
                <Radio value>On</Radio>
              </Radio.Group>
              {until ? (
                <DatePicker
                  size="small"
                  className="datepicker"
                  value={moment(until)}
                  allowClear={false}
                  format={DATE_FORMAT}
                  onChange={this.setScheduleUntil}
                />
              ) : null}
            </div>
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
