import { createParameter } from "..";
import { getDynamicDateFromString } from "../DateParameter";
import moment from "moment";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("DateParameter", () => {
  let type = "date";
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
      param.setValue(moment("2019-10-06 10:00:00"));
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("formats value as a string date", () => {
      const executionValue = param.getExecutionValue();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(executionValue).toBe("2019-10-06");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("type is datetime-local", () => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeAll'.
      beforeAll(() => {
        type = "datetime-local";
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("formats value as a string datetime", () => {
        const executionValue = param.getExecutionValue();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(executionValue).toBe("2019-10-06 10:00");
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("type is datetime-with-seconds", () => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeAll'.
      beforeAll(() => {
        type = "datetime-with-seconds";
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("formats value as a string datetime with seconds", () => {
        const executionValue = param.getExecutionValue();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(executionValue).toBe("2019-10-06 10:00:00");
      });
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("normalizeValue", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("recognizes dates from strings", () => {
      const normalizedValue = param.normalizeValue("2019-10-06");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(moment.isMoment(normalizedValue)).toBeTruthy();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue.format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("recognizes dates from moment values", () => {
      const normalizedValue = param.normalizeValue(moment("2019-10-06"));
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(moment.isMoment(normalizedValue)).toBeTruthy();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue.format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("normalizes unrecognized values as null", () => {
      const normalizedValue = param.normalizeValue("value");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBeNull();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("Dynamic values", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("recognizes dynamic values from string index", () => {
        const normalizedValue = param.normalizeValue("d_now");
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).not.toBeNull();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toEqual(getDynamicDateFromString("d_now"));
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("recognizes dynamic values from a dynamic date", () => {
        const dynamicDate = getDynamicDateFromString("d_now");
        const normalizedValue = param.normalizeValue(dynamicDate);
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).not.toBeNull();
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toEqual(dynamicDate);
      });
    });
  });
});
