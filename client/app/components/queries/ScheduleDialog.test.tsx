import React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'enzy... Remove this comment to see the full error message
import { mount } from "enzyme";
import moment from "moment";
import ScheduleDialog, { TimeEditor } from "./ScheduleDialog";
// @ts-expect-error ts-migrate(2613) FIXME: Module '"/Users/elad.ossadon/dev/redash/client/app... Remove this comment to see the full error message
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

function getWrapper(schedule = {}, {
  onConfirm,
  onCancel,
  ...props
}: any = {}) {
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

function findByTestID(wrapper: any, id: any) {
  return wrapper.find(`[data-testid="${id}"]`);
}

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("ScheduleDialog", () => {
  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("Sets correct schedule settings", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test('Sets to "Never"', () => {
      const [wrapper] = getWrapper();
      const el = findByTestID(wrapper, "interval");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(el).toMatchSnapshot();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test('Sets to "5 Minutes"', () => {
      const [wrapper] = getWrapper({ interval: 300 });
      const el = findByTestID(wrapper, "interval");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(el).toMatchSnapshot();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test('Sets to "2 Hours"', () => {
      const [wrapper] = getWrapper({ interval: 7200 });
      const el = findByTestID(wrapper, "interval");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(el).toMatchSnapshot();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe('Sets to "1 Day 22:15"', () => {
      const [wrapper] = getWrapper({
        interval: 86400,
        time: "22:15",
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Sets to correct interval", () => {
        const el = findByTestID(wrapper, "interval");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Sets to correct time", () => {
        const el = findByTestID(wrapper, "time");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("TimeEditor", () => {
      const defaultValue = moment()
        .hour(5)
        .minute(25); // 05:25

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("UTC set correctly on init", () => {
        const editor = mount(<TimeEditor defaultValue={defaultValue} onChange={() => {}} />);
        const utc = findByTestID(editor, "utc");

        // expect utc to be 2h below initial time
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(utc.text()).toBe("(03:25 UTC)");
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("UTC time should not render", () => {
        const utcValue = moment.utc(defaultValue);
        const editor = mount(<TimeEditor defaultValue={utcValue} onChange={() => {}} />);
        const utc = findByTestID(editor, "utc");

        // expect utc to not render
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(utc.exists()).toBeFalsy();
      });

      // Disabling this test as the TimePicker wasn't setting values from here after Antd v4
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      // eslint-disable-next-line jest/no-disabled-tests
      test.skip("onChange correct result", () => {
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
        const onChangeCb = jest.fn((time: any) => time.format("HH:mm"));
        const editor = mount(<TimeEditor onChange={onChangeCb} />);

        // click TimePicker
        editor.find(".ant-picker-input input").simulate("mouseDown");

        const timePickerPanel = editor.find(".ant-picker-panel");

        // select hour "07"
        const hourSelector = timePickerPanel.find(".ant-picker-time-panel-column").at(0);
        hourSelector
          .find("li")
          .at(7)
          .simulate("click");

        // select minute "30"
        const minuteSelector = timePickerPanel.find(".ant-picker-time-panel-column").at(1);
        minuteSelector
          .find("li")
          .at(6)
          .simulate("click");

        timePickerPanel
          .find(".ant-picker-ok")
          .find("button")
          .simulate("mouseDown");

        // expect utc to be 2h below initial time
        const utc = findByTestID(editor, "utc");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(utc.text()).toBe("(05:30 UTC)");

        // expect 07:30 from onChange
        const onChangeResult = onChangeCb.mock.results[1].value;
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(onChangeResult).toBe("07:30");
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe('Sets to "2 Weeks 22:15 Tuesday"', () => {
      const [wrapper] = getWrapper({
        interval: 1209600,
        time: "22:15",
        day_of_week: "Monday",
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Sets to correct interval", () => {
        const el = findByTestID(wrapper, "interval");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Sets to correct time", () => {
        const el = findByTestID(wrapper, "time");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Sets to correct weekday", () => {
        const el = findByTestID(wrapper, "weekday");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("Until feature", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Until not set", () => {
        const [wrapper] = getWrapper({ interval: 300 });
        const el = findByTestID(wrapper, "ends");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Until is set", () => {
        const [wrapper] = getWrapper({ interval: 300, until: "2030-01-01" });
        const el = findByTestID(wrapper, "ends");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("Supports 30 days interval with no time value", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("Time is none", () => {
        const [wrapper] = getWrapper({ interval: 30 * 24 * 3600 });
        const el = findByTestID(wrapper, "time");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(el).toMatchSnapshot();
      });
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("Adheres to user permissions", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("Shows correct interval options", () => {
      const refreshOptions = [60, 300, 3600, 7200]; // 1 min, 1 hour
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
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
      ).find(".ant-select-item-option-content");

      const texts = options.map((node: any) => node.text());
      const expected = ["Never", "1 minute", "5 minutes", "1 hour", "2 hours"];

      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      // eslint-disable-next-line jest/prefer-to-have-length
      expect(options.length).toEqual(expected.length);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(texts).toEqual(expected);
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("Modal Confirm/Cancel feature", () => {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
    const confirmCb = jest.fn().mockName("confirmCb");
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
    const closeCb = jest.fn().mockName("closeCb");
    const initProps = { onConfirm: confirmCb, onCancel: closeCb };

    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
    beforeEach(() => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
      jest.clearAllMocks();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("Query saved on confirm if state changed", () => {
      // init
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(confirmCb).toHaveBeenCalled();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(closeCb).toHaveBeenCalled();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("Query not saved on confirm if state unchanged", () => {
      // init
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      const [wrapper] = getWrapper(null, initProps);

      // click confirm button
      wrapper
        .find(".ant-modal-footer")
        .find(".ant-btn-primary")
        .simulate("click");

      // expect calls
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(confirmCb).not.toHaveBeenCalled();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(closeCb).toHaveBeenCalled();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("Cancel closes modal and query unsaved", () => {
      // init
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(confirmCb).not.toHaveBeenCalled();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(closeCb).toHaveBeenCalled();
    });
  });
});
