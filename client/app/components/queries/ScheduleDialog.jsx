import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import DatePicker from 'antd/lib/date-picker';
import TimePicker from 'antd/lib/time-picker';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import { capitalize, clone, isEqual } from 'lodash';
import moment from 'moment';
import { secondsToInterval, durationHumanize, pluralize, IntervalEnum, localizeTime } from '@/filters';

import './ScheduleDialog.css';

const WEEKDAYS_SHORT = moment.weekdaysShort();
const WEEKDAYS_FULL = moment.weekdays();
const DATE_FORMAT = 'YYYY-MM-DD';
const HOUR_FORMAT = 'HH:mm';
const { Option, OptGroup } = Select;

export class ScheduleDialog extends React.Component {
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
    const { time, interval: seconds, day_of_week: day } = newSchedule;
    const { interval } = secondsToInterval(seconds);
    const [hour, minute] = time ? localizeTime(time).split(':') : [null, null];

    return {
      hour,
      minute,
      seconds,
      interval,
      dayOfWeek: day ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(day)] : null,
      newSchedule,
    };
  }

  get intervals() {
    const ret = {
      [IntervalEnum.NEVER]: [],
    };
    this.props.refreshOptions.forEach((seconds) => {
      const { count, interval } = secondsToInterval(seconds);
      if (!(interval in ret)) {
        ret[interval] = [];
      }
      ret[interval].push([count, seconds]);
    });

    Object.defineProperty(this, 'intervals', { value: ret }); // memoize

    return ret;
  }

  set newSchedule(newProps) {
    this.setState({
      newSchedule: Object.assign(this.state.newSchedule, newProps),
    });
  }

  setTime = (time) => {
    this.newSchedule = {
      time: moment(time).utc().format(HOUR_FORMAT),
    };
  };

  setInterval = (newSeconds) => {
    const { newSchedule } = this.state;
    const { interval: newInterval } = secondsToInterval(newSeconds);

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

    newSchedule.interval = newSeconds;

    const [hour, minute] = newSchedule.time ?
      localizeTime(newSchedule.time).split(':')
      : [null, null];

    this.setState({
      interval: newInterval,
      seconds: newSeconds,
      hour,
      minute,
      dayOfWeek: newSchedule.day_of_week
        ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(newSchedule.day_of_week)]
        : null,
    });

    this.newSchedule = newSchedule;
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
      interval, minute, hour, seconds, newSchedule: { until },
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
          <div data-testid="interval">
            <Select value={seconds} onChange={this.setInterval} {...selectProps}>
              <Option value={null} key="never">Never</Option>
              {Object.keys(this.intervals).map(int => (
                <OptGroup label={capitalize(pluralize(int))} key={int}>
                  {this.intervals[int].map(([cnt, secs]) => (
                    <Option value={secs} key={cnt}>{durationHumanize(secs)}</Option>
                  ))}
                </OptGroup>
                ))}
            </Select>
          </div>
        </div>
        {[IntervalEnum.DAYS, IntervalEnum.WEEKS].indexOf(interval) !== -1 ? (
          <div className="schedule-component">
            <h5>On time</h5>
            <div data-testid="time">
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
            <div data-testid="weekday">
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
          </div>
        ) : null}
        {interval !== IntervalEnum.NEVER ? (
          <div className="schedule-component">
            <h5>Ends</h5>
            <div className="ends" data-testid="ends">
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
