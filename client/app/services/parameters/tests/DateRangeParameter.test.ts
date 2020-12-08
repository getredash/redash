import { createParameter } from "..";
import { getDynamicDateRangeFromString } from "../DateRangeParameter";
import moment from "moment";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("DateRangeParameter", () => {
  let type = "date-range";
  let param: any;

  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
  beforeEach(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter({ name: "param", title: "Param", type });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("getExecutionValue", () => {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
    beforeEach(() => {
      param.setValue({ start: "2019-10-05 10:00:00", end: "2019-10-06 09:59:59" });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("formats value as a string date", () => {
      const executionValue = param.getExecutionValue();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(executionValue).toEqual({ start: "2019-10-05", end: "2019-10-06" });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("type is datetime-range", () => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeAll'.
      beforeAll(() => {
        type = "datetime-range";
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("formats value as a string datetime", () => {
        const executionValue = param.getExecutionValue();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(executionValue).toEqual({ start: "2019-10-05 10:00", end: "2019-10-06 09:59" });
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("type is datetime-range-with-seconds", () => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeAll'.
      beforeAll(() => {
        type = "datetime-range-with-seconds";
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("formats value as a string datetime with seconds", () => {
        const executionValue = param.getExecutionValue();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(executionValue).toEqual({ start: "2019-10-05 10:00:00", end: "2019-10-06 09:59:59" });
      });
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("normalizeValue", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("recognizes dates from moment arrays", () => {
      const normalizedValue = param.normalizeValue([moment("2019-10-05"), moment("2019-10-06")]);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toHaveLength(2);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue[0].format("YYYY-MM-DD")).toBe("2019-10-05");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue[1].format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("recognizes dates from object", () => {
      const normalizedValue = param.normalizeValue({ start: "2019-10-05", end: "2019-10-06" });
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toHaveLength(2);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue[0].format("YYYY-MM-DD")).toBe("2019-10-05");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue[1].format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("Dynamic values", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("recognizes dynamic values from string index", () => {
        const normalizedValue = param.normalizeValue("d_last_week");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).not.toBeNull();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toEqual(getDynamicDateRangeFromString("d_last_week"));
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("recognizes dynamic values from a dynamic date range", () => {
        const dynamicDateRange = getDynamicDateRangeFromString("d_last_week");
        const normalizedValue = param.normalizeValue(dynamicDateRange);
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).not.toBeNull();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toEqual(dynamicDateRange);
      });
    });
  });
});
