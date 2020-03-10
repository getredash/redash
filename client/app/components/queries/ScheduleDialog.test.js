import React from "react";
import { mount } from "enzyme";
import moment from "moment";
import ScheduleDialog, { TimeEditor } from "./ScheduleDialog";
import RefreshScheduleDefault from "../proptypes";

const defaultProps = {
  schedule: RefreshScheduleDefault,
  refreshOptions: [
    60,
    300,
    600, // 1, 5 ,10 mins
    3600,
    36000,
    82800, // 1, 10, 23 hours
    86400,
    172800,
    518400, // 1, 2, 6 days
    604800,
    1209600, // 1, 2, 4 weeks
  ],
  dialog: {
    props: {
      visible: true,
      onOk: () => {},
      onCancel: () => {},
      afterClose: () => {},
    },
    close: () => {},
    dismiss: () => {},
  },
};

function getWrapper(schedule = {}, { onConfirm, onCancel, ...props } = {}) {
  onConfirm = onConfirm || (() => {});
  onCancel = onCancel || (() => {});

  props = {
    ...defaultProps,
    ...props,
    schedule: {
      ...RefreshScheduleDefault,
      ...schedule,
    },
    dialog: {
      props: {
        visible: true,
        onOk: onConfirm,
        onCancel,
        afterClose: () => {},
      },
      close: onConfirm,
      dismiss: onCancel,
    },
  };

  return [mount(<ScheduleDialog.Component {...props} />), props];
}

function findByTestID(wrapper, id) {
  return wrapper.find(`[data-testid="${id}"]`);
}

describe("ScheduleDialog", () => {
  describe("Sets correct schedule settings", () => {
    test('Sets to "Never"', () => {
      const [wrapper] = getWrapper();
      const el = findByTestID(wrapper, "interval");
      expect(el).toMatchSnapshot();
    });

    test('Sets to "5 Minutes"', () => {
      const [wrapper] = getWrapper({ interval: 300 });
      const el = findByTestID(wrapper, "interval");
      expect(el).toMatchSnapshot();
    });

    test('Sets to "2 Hours"', () => {
      const [wrapper] = getWrapper({ interval: 7200 });
      const el = findByTestID(wrapper, "interval");
      expect(el).toMatchSnapshot();
    });

    describe('Sets to "1 Day 22:15"', () => {
      const [wrapper] = getWrapper({
        interval: 86400,
        time: "22:15",
      });

      test("Sets to correct interval", () => {
        const el = findByTestID(wrapper, "interval");
        expect(el).toMatchSnapshot();
      });

      test("Sets to correct time", () => {
        const el = findByTestID(wrapper, "time");
        expect(el).toMatchSnapshot();
      });
    });

    describe("TimeEditor", () => {
      const defaultValue = moment()
        .hour(5)
        .minute(25); // 05:25

      test("UTC set correctly on init", () => {
        const editor = mount(<TimeEditor defaultValue={defaultValue} onChange={() => {}} />);
        const utc = findByTestID(editor, "utc");

        // expect utc to be 2h below initial time
        expect(utc.text()).toBe("(03:25 UTC)");
      });

      test("UTC time should not render", () => {
        const utcValue = moment.utc(defaultValue);
        const editor = mount(<TimeEditor defaultValue={utcValue} onChange={() => {}} />);
        const utc = findByTestID(editor, "utc");

        // expect utc to not render
        expect(utc.exists()).toBeFalsy();
      });

      test("onChange correct result", () => {
        const onChangeCb = jest.fn(time => time.format("HH:mm"));
        const editor = mount(<TimeEditor onChange={onChangeCb} />);

        // click TimePicker
        editor.find(".ant-time-picker-input").simulate("click");

        // select hour "07"
        const hourSelector = editor.find(".ant-time-picker-panel-select").at(0);
        hourSelector
          .find("li")
          .at(7)
          .simulate("click");

        // select minute "30"
        const minuteSelector = editor.find(".ant-time-picker-panel-select").at(1);
        minuteSelector
          .find("li")
          .at(6)
          .simulate("click");

        // expect utc to be 2h below initial time
        const utc = findByTestID(editor, "utc");
        expect(utc.text()).toBe("(05:30 UTC)");

        // expect 07:30 from onChange
        const onChangeResult = onChangeCb.mock.results[1].value;
        expect(onChangeResult).toBe("07:30");
      });
    });

    describe('Sets to "2 Weeks 22:15 Tuesday"', () => {
      const [wrapper] = getWrapper({
        interval: 1209600,
        time: "22:15",
        day_of_week: "Monday",
      });

      test("Sets to correct interval", () => {
        const el = findByTestID(wrapper, "interval");
        expect(el).toMatchSnapshot();
      });

      test("Sets to correct time", () => {
        const el = findByTestID(wrapper, "time");
        expect(el).toMatchSnapshot();
      });

      test("Sets to correct weekday", () => {
        const el = findByTestID(wrapper, "weekday");
        expect(el).toMatchSnapshot();
      });
    });

    describe("Until feature", () => {
      test("Until not set", () => {
        const [wrapper] = getWrapper({ interval: 300 });
        const el = findByTestID(wrapper, "ends");
        expect(el).toMatchSnapshot();
      });

      test("Until is set", () => {
        const [wrapper] = getWrapper({ interval: 300, until: "2030-01-01" });
        const el = findByTestID(wrapper, "ends");
        expect(el).toMatchSnapshot();
      });
    });

    describe("Supports 30 days interval with no time value", () => {
      test("Time is none", () => {
        const [wrapper] = getWrapper({ interval: 30 * 24 * 3600 });
        const el = findByTestID(wrapper, "time");
        expect(el).toMatchSnapshot();
      });
    });
  });

  describe("Adheres to user permissions", () => {
    test("Shows correct interval options", () => {
      const refreshOptions = [60, 300, 3600, 7200]; // 1 min, 1 hour
      const [wrapper] = getWrapper(null, { refreshOptions });

      // click select
      findByTestID(wrapper, "interval")
        .find(".ant-select")
        .simulate("click");

      // get dropdown menu items
      const options = mount(
        wrapper
          .find("Trigger")
          .instance()
          .getComponent()
      ).find("MenuItem");

      const texts = options.map(node => node.text());
      const expected = ["Never", "1 minute", "5 minutes", "1 hour", "2 hours"];

      // eslint-disable-next-line jest/prefer-to-have-length
      expect(options.length).toEqual(expected.length);
      expect(texts).toEqual(expected);
    });
  });

  describe("Modal Confirm/Cancel feature", () => {
    const confirmCb = jest.fn().mockName("confirmCb");
    const closeCb = jest.fn().mockName("closeCb");
    const initProps = { onConfirm: confirmCb, onCancel: closeCb };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("Query saved on confirm if state changed", () => {
      // init
      const [wrapper, props] = getWrapper(null, initProps);

      // change state
      const change = { time: "22:15" };
      const newSchedule = Object.assign({}, props.schedule, change);
      wrapper.setState({ newSchedule });

      // click confirm button
      wrapper
        .find(".ant-modal-footer")
        .find(".ant-btn-primary")
        .simulate("click");

      // expect calls
      expect(confirmCb).toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Query not saved on confirm if state unchanged", () => {
      // init
      const [wrapper] = getWrapper(null, initProps);

      // click confirm button
      wrapper
        .find(".ant-modal-footer")
        .find(".ant-btn-primary")
        .simulate("click");

      // expect calls
      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Cancel closes modal and query unsaved", () => {
      // init
      const [wrapper, props] = getWrapper(null, initProps);

      // change state
      const change = { time: "22:15" };
      const newSchedule = Object.assign({}, props.schedule, change);
      wrapper.setState({ newSchedule });

      // click cancel button
      wrapper
        .find(".ant-modal-footer")
        .find("button:not(.ant-btn-primary)")
        .simulate("click");

      // expect calls
      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });
  });
});
