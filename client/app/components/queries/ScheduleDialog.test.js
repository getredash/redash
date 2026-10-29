import React from "react";
import { render, fireEvent } from "@testing-library/react";
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

function renderDialog(schedule = {}, { onConfirm, onCancel, ...props } = {}) {
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

  render(<ScheduleDialog.Component {...props} />);
  return props;
}

function findByTestID(id) {
  return document.querySelector(`[data-testid="${id}"]`);
}

function selectedInterval() {
  const item = findByTestID("interval").querySelector(".ant-select-selection-item");
  return item ? item.textContent : null;
}

function timeValue() {
  return findByTestID("time").querySelector("input").value;
}

function checkedRadio(id) {
  return findByTestID(id).querySelector(".ant-radio-button-wrapper-checked, .ant-radio-wrapper-checked").textContent;
}

function openIntervalSelect() {
  fireEvent.mouseDown(findByTestID("interval").querySelector(".ant-select-selector"));
  return Array.from(document.querySelectorAll(".ant-select-item-option"));
}

function chooseInterval(label) {
  const option = openIntervalSelect().find((item) => item.textContent === label);
  fireEvent.click(option);
}

function clickModalButton(selector) {
  fireEvent.click(document.querySelector(`.ant-modal-footer ${selector}`));
}

describe("ScheduleDialog", () => {
  describe("Sets correct schedule settings", () => {
    test('Sets to "Never"', () => {
      renderDialog();
      expect(selectedInterval()).toBeNull();
      expect(findByTestID("time")).toBeNull();
      expect(findByTestID("ends")).toBeNull();
    });

    test('Sets to "5 Minutes"', () => {
      renderDialog({ interval: 300 });
      expect(selectedInterval()).toBe("5 minutes");
    });

    test('Sets to "2 Hours"', () => {
      // 2 hours isn't one of the refresh options, so the raw value is shown
      renderDialog({ interval: 7200 });
      expect(selectedInterval()).toBe("7200");
    });

    test('Sets to "1 Day 22:15"', () => {
      renderDialog({ interval: 86400, time: "22:15" });
      expect(selectedInterval()).toBe("1 day");
      // time is stored in UTC and shown in local time (tests run in UTC+2)
      expect(timeValue()).toBe("00:15");
      expect(findByTestID("weekday")).toBeNull();
    });

    describe("TimeEditor", () => {
      const defaultValue = moment().hour(5).minute(25); // 05:25

      test("UTC set correctly on init", () => {
        render(<TimeEditor defaultValue={defaultValue} onChange={() => {}} />);

        // expect utc to be 2h below initial time
        expect(findByTestID("utc").textContent).toBe("(03:25 UTC)");
      });

      test("UTC time should not render", () => {
        const utcValue = moment.utc(defaultValue);
        render(<TimeEditor defaultValue={utcValue} onChange={() => {}} />);

        // expect utc to not render
        expect(findByTestID("utc")).toBeNull();
      });
    });

    test('Sets to "2 Weeks 22:15 Monday"', () => {
      renderDialog({ interval: 1209600, time: "22:15", day_of_week: "Monday" });
      expect(selectedInterval()).toBe("2 weeks");
      expect(timeValue()).toBe("00:15");
      expect(checkedRadio("weekday")).toBe("M");
      expect(findByTestID("weekday").querySelectorAll(".ant-radio-button-wrapper")).toHaveLength(7);
    });

    describe("Until feature", () => {
      test("Until not set", () => {
        renderDialog({ interval: 300 });
        expect(checkedRadio("ends")).toBe("Never");
        expect(findByTestID("ends").querySelector(".ant-picker")).toBeNull();
      });

      test("Until is set", () => {
        renderDialog({ interval: 300, until: "2030-01-01" });
        expect(checkedRadio("ends")).toBe("On");
        expect(findByTestID("ends").querySelector(".ant-picker input").value).toBe("2030-01-01");
      });
    });

    describe("Supports 30 days interval with no time value", () => {
      test("Time is none", () => {
        renderDialog({ interval: 30 * 24 * 3600 });
        expect(timeValue()).toBe("");
      });
    });
  });

  describe("Adheres to user permissions", () => {
    test("Shows correct interval options", () => {
      const refreshOptions = [60, 300, 3600, 7200]; // 1 min, 5 min, 1 hour, 2 hours
      renderDialog(null, { refreshOptions });

      const labels = openIntervalSelect().map((option) => option.textContent);
      expect(labels).toEqual(["Never", "1 minute", "5 minutes", "1 hour", "2 hours"]);
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
      renderDialog(null, initProps);
      chooseInterval("1 minute");
      clickModalButton(".ant-btn-primary");

      expect(confirmCb).toHaveBeenCalledWith(expect.objectContaining({ interval: 60 }));
      expect(closeCb).toHaveBeenCalled();
    });

    test("Query not saved on confirm if state unchanged", () => {
      renderDialog(null, initProps);
      clickModalButton(".ant-btn-primary");

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Cancel closes modal and query unsaved", () => {
      renderDialog(null, initProps);
      chooseInterval("1 minute");
      clickModalButton("button:not(.ant-btn-primary)");

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });
  });
});
