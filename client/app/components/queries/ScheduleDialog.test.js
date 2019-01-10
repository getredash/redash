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

describe('ScheduleDialog', () => {
  beforeAll(() => {
    // mock date string so snapshots don't get invalidated
    window.Date.prototype.toISOString = jest.fn(() => 'mocked ISO');
  });

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
});
