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

describe('ScheduleDialog', () => {
  describe('Sets correct schedule settings', () => {
    test('Sets to "Never"', () => {
      const [wrapper] = getWrapper();
      const el = wrapper.find('[data-testid="interval"]');
      expect(el).toMatchSnapshot();
    });
  });
});
