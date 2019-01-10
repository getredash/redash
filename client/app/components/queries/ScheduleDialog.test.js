import React from 'react';
import { mount } from 'enzyme';
import { ScheduleDialog } from './ScheduleDialog';

const defaultProps = {
  show: true,
  query: {
    schedule: {
      time: null,
      until: null,
      interval: null,
      day_of_week: null,
    },
  },
  refreshOptions: [
    60, 300, 600, // 1, 5 ,10 mins
    3600, 36000, 82800, // 1, 10, 23 hours
    86400, 172800, 518400, // 1, 2, 6 days
    604800, 1209600, // 1, 2, 4 weeks
  ],
  updateQuery: () => {},
  onClose: () => {},
};

function getWrapper(schedule = {}, props = {}) {
  const defaultSchedule = defaultProps.query.schedule;
  props = Object.assign(
    {},
    defaultProps,
    props,
    { query: { schedule: Object.assign({}, defaultSchedule, schedule) } },
  );
  return [mount(<ScheduleDialog {...props} />), props];
}

function findByTestID(wrapper, id) {
  return wrapper.find(`[data-testid="${id}"]`);
}

function getSelectOptions(wrapper) {
  jest.useFakeTimers();

  // click select
  wrapper.find('.ant-select').simulate('click');

  // run timers
  jest.runAllTimers();
  jest.useRealTimers();

  // get dropdown menu
  const dropdown = mount(wrapper
    .find('Trigger')
    .instance()
    .getComponent());

  // get menu items
  return dropdown.find('MenuItem');
}

describe('ScheduleDialog', () => {
  describe('Sets correct schedule settings', () => {
    test('Sets to "Never"', () => {
      const [wrapper] = getWrapper();
      const el = findByTestID(wrapper, 'interval');
      expect(el).toMatchSnapshot();
    });

    test('Sets to "5 Minutes"', () => {
      const [wrapper] = getWrapper({ interval: 300 });
      const el = findByTestID(wrapper, 'interval');
      expect(el).toMatchSnapshot();
    });

    test('Sets to "2 Hours"', () => {
      const [wrapper] = getWrapper({ interval: 7200 });
      const el = findByTestID(wrapper, 'interval');
      expect(el).toMatchSnapshot();
    });

    describe('Sets to "1 Day 22:15"', () => {
      const [wrapper] = getWrapper({
        interval: 86400,
        time: '22:15',
      });

      test('Sets to correct interval', () => {
        const el = findByTestID(wrapper, 'interval');
        expect(el).toMatchSnapshot();
      });

      test('Sets to correct time', () => {
        const el = findByTestID(wrapper, 'time');
        expect(el).toMatchSnapshot();
      });
    });

    describe('Sets to "2 Weeks 22:15 Tuesday"', () => {
      const [wrapper] = getWrapper({
        interval: 1209600,
        time: '22:15',
        day_of_week: 2,
      });

      test('Sets to correct interval', () => {
        const el = findByTestID(wrapper, 'interval');
        expect(el).toMatchSnapshot();
      });

      test('Sets to correct time', () => {
        const el = findByTestID(wrapper, 'time');
        expect(el).toMatchSnapshot();
      });

      test('Sets to correct weekday', () => {
        const el = findByTestID(wrapper, 'weekday');
        expect(el).toMatchSnapshot();
      });
    });

    describe('Until feature', () => {
      test('Until not set', () => {
        const [wrapper] = getWrapper({ interval: 300 });
        const el = findByTestID(wrapper, 'ends');
        expect(el).toMatchSnapshot();
      });

      test('Until is set', () => {
        const [wrapper] = getWrapper({ interval: 300, until: '2030-01-01' });
        const el = findByTestID(wrapper, 'ends');
        expect(el).toMatchSnapshot();
      });
    });
  });

  describe('Adheres to user permissions', () => {
    test('Shows correct interval options', () => {
      const refreshOptions = [60, 3600]; // 1 min, 1 hour
      const [wrapper] = getWrapper(null, { refreshOptions });
      const selectWrapper = findByTestID(wrapper, 'select-interval');
      const options = getSelectOptions(selectWrapper);

      const texts = options.map(node => node.text());
      const expected = ['Never', 'minute(s)', 'hour(s)'];

      // eslint-disable-next-line jest/prefer-to-have-length
      expect(options.length).toEqual(expected.length);
      expect(texts).toEqual(expected);
    });

    // skipped due to issue #3263 https://git.io/fhZcG
    // eslint-disable-next-line jest/no-disabled-tests
    test.skip('Shows correct count options', () => {
      const [wrapper] = getWrapper({ interval: 300 });
      const selectWrapper = findByTestID(wrapper, 'select-count');
      const options = getSelectOptions(selectWrapper);

      const texts = options.map(node => node.text());
      const expected = ['1', '5', '10'];

      // eslint-disable-next-line jest/prefer-to-have-length
      expect(options.length).toEqual(expected.length);
      expect(texts).toEqual(expected);
    });
  });

  test('Resets selected count value if out-of-range', () => {
    // init
    const initProps = { interval: 600 };
    const [wrapper] = getWrapper(initProps);

    const intervalWrapper = findByTestID(wrapper, 'select-interval');
    const options = getSelectOptions(intervalWrapper);

    // change to 'hours(s)'
    options
      .filterWhere(node => node.text() === 'hour(s)')
      .simulate('click');
    wrapper.update();

    // should stay '10'
    expect(wrapper.state('count')).toBe('10');

    // change to 'week(s)'
    options
      .filterWhere(node => node.text() === 'week(s)')
      .simulate('click');
    wrapper.update();

    // should have changed to '1'
    expect(wrapper.state('count')).toBe('1');
  });

  describe('Modal Confirm/Cancel feature', () => {
    const confirmCb = jest.fn().mockName('confirmCb');
    const closeCb = jest.fn().mockName('closeCb');
    const initProps = { updateQuery: confirmCb, onClose: closeCb };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('Query saved on confirm if state changed', () => {
      // init
      const [wrapper, props] = getWrapper(null, initProps);

      // change state
      const change = { time: '22:15' };
      const newSchedule = Object.assign({}, props.schedule, change);
      wrapper.setState({ newSchedule });

      // click confirm button
      wrapper
        .find('.ant-modal-footer')
        .find('.ant-btn-primary')
        .simulate('click');

      // expect calls
      expect(confirmCb).toBeCalled();
      expect(closeCb).toBeCalled();
    });

    test('Query not saved on confirm if state unchanged', () => {
      // init
      const [wrapper] = getWrapper(null, initProps);

      // click confirm button
      wrapper
        .find('.ant-modal-footer')
        .find('.ant-btn-primary')
        .simulate('click');

      // expect calls
      expect(confirmCb).not.toBeCalled();
      expect(closeCb).toBeCalled();
    });

    test('Cancel closes modal and query unsaved', () => {
      // init
      const [wrapper, props] = getWrapper(null, initProps);

      // change state
      const change = { time: '22:15' };
      const newSchedule = Object.assign({}, props.schedule, change);
      wrapper.setState({ newSchedule });

      // click cancel button
      wrapper
        .find('.ant-modal-footer')
        .find('button:not(.ant-btn-primary)')
        .simulate('click');

      // expect calls
      expect(confirmCb).not.toBeCalled();
      expect(closeCb).toBeCalled();
    });
  });
});
