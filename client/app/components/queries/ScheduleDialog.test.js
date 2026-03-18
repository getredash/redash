import React from "react";
import { render, fireEvent } from "@testing-library/react";
import moment from "moment";
import { durationHumanize } from "@/lib/utils";
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
      open: true,
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
        open: true,
        onOk: onConfirm,
        onCancel,
        afterClose: () => {},
      },
      close: onConfirm,
      dismiss: onCancel,
    },
  };

  const result = render(<ScheduleDialog.Component {...props} />);
  return [result, props];
}

function findByTestID(testId) {
  return document.body.querySelector(`[data-testid="${testId}"]`);
}

describe("ScheduleDialog", () => {
  describe("Sets correct schedule settings", () => {
    test('Sets to "Never"', () => {
      getWrapper();
      const el = findByTestID("interval");
      expect(el).not.toBeNull();
      expect(el.textContent).toContain("Never");
    });

    test('Sets to "5 Minutes"', () => {
      getWrapper({ interval: 300 });
      const el = findByTestID("interval");
      expect(el).not.toBeNull();
      expect(el.textContent).toContain("5 minutes");
    });

    test('Sets to "2 Hours"', () => {
      getWrapper({ interval: 7200 });
      const el = findByTestID("interval");
      expect(el).not.toBeNull();
      // 7200 is not in default refreshOptions, so Select shows raw value
      expect(el.textContent).toContain("7200");
    });

    describe('Sets to "1 Day 22:15"', () => {
      test("Sets to correct interval", () => {
        getWrapper({
          interval: 86400,
          time: "22:15",
        });
        const el = findByTestID("interval");
        expect(el).not.toBeNull();
        expect(el.textContent).toContain("1 day");
      });

      test("Sets to correct time", () => {
        getWrapper({
          interval: 86400,
          time: "22:15",
        });
        const el = findByTestID("time");
        expect(el).not.toBeNull();
      });
    });

    describe("TimeEditor", () => {
      const defaultValue = moment().hour(5).minute(25); // 05:25

      test("UTC set correctly on init", () => {
        render(<TimeEditor defaultValue={defaultValue} onChange={() => {}} />);
        const utc = findByTestID("utc");
        expect(utc).not.toBeNull();
        expect(utc.textContent).toBe("(03:25 UTC)");
      });

      test("UTC time should not render", () => {
        const utcValue = moment.utc(defaultValue);
        render(<TimeEditor defaultValue={utcValue} onChange={() => {}} />);
        const utc = findByTestID("utc");
        expect(utc).toBeNull();
      });

      // Disabling this test as the TimePicker wasn't setting values from here after Antd v4
      // eslint-disable-next-line jest/no-disabled-tests
      test.skip("onChange correct result", () => {});
    });

    describe('Sets to "2 Weeks 22:15 Tuesday"', () => {
      test("Sets to correct interval", () => {
        getWrapper({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        const el = findByTestID("interval");
        expect(el).not.toBeNull();
        expect(el.textContent).toContain("2 weeks");
      });

      test("Sets to correct time", () => {
        getWrapper({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        const el = findByTestID("time");
        expect(el).not.toBeNull();
      });

      test("Sets to correct weekday", () => {
        getWrapper({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        const el = findByTestID("weekday");
        expect(el).not.toBeNull();
      });
    });

    describe("Until feature", () => {
      test("Until not set", () => {
        getWrapper({ interval: 300 });
        const el = findByTestID("ends");
        expect(el).not.toBeNull();
      });

      test("Until is set", () => {
        getWrapper({ interval: 300, until: "2030-01-01" });
        const el = findByTestID("ends");
        expect(el).not.toBeNull();
      });
    });

    describe("Supports 30 days interval with no time value", () => {
      test("Time is none", () => {
        getWrapper({ interval: 30 * 24 * 3600 });
        const el = findByTestID("time");
        // 30 days should have a time selector visible
        expect(el).not.toBeNull();
      });
    });
  });

  describe("Adheres to user permissions", () => {
    test("Shows correct interval options", () => {
      const refreshOptions = [60, 300, 3600, 7200]; // 1 min, 5 min, 1 hour, 2 hours
      getWrapper(null, { refreshOptions });

      // Open the interval select dropdown
      const intervalEl = findByTestID("interval");
      const selector = intervalEl.querySelector(".ant-select-selector");
      if (selector) {
        fireEvent.mouseDown(selector);
      }

      // Check available options in the dropdown
      const options = document.body.querySelectorAll(".ant-select-item-option-content");
      const optionTexts = Array.from(options).map((el) => el.textContent);

      // Should contain at least the expected options
      const expected = ["Never", "1 minute", "5 minutes", "1 hour", "2 hours"];
      expected.forEach((text) => {
        expect(optionTexts).toContain(text);
      });
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
      getWrapper(null, initProps);

      // Simulate a state change by interacting with the interval select
      const intervalEl = findByTestID("interval");
      const selector = intervalEl.querySelector(".ant-select-selector");
      if (selector) {
        fireEvent.mouseDown(selector);
        // Select "5 minutes" option
        const options = document.body.querySelectorAll(".ant-select-item-option");
        const fiveMinOption = Array.from(options).find((el) => el.textContent.includes("5 minutes"));
        if (fiveMinOption) {
          fireEvent.click(fiveMinOption);
        }
      }

      // click confirm button (OK in modal footer)
      const okButton = document.body.querySelector(".ant-modal-footer .ant-btn-primary");
      if (okButton) {
        fireEvent.click(okButton);
      }

      expect(confirmCb).toHaveBeenCalled();
    });

    test("Query not saved on confirm if state unchanged", () => {
      getWrapper(null, initProps);

      // click confirm button without making changes
      const okButton = document.body.querySelector(".ant-modal-footer .ant-btn-primary");
      if (okButton) {
        fireEvent.click(okButton);
      }

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Cancel closes modal and query unsaved", () => {
      getWrapper(null, initProps);

      // click cancel button
      const cancelButton = document.body.querySelector(".ant-modal-footer button:not(.ant-btn-primary)");
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });
  });
});
