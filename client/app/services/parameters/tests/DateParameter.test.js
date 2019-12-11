import { Parameter } from "..";
import { getDynamicDateFromString } from "../DateParameter";
import moment from "moment";

describe("DateParameter", () => {
  let type = "date";
  let param;

  beforeEach(() => {
    param = Parameter.create({ name: "param", title: "Param", type });
  });

  describe("getExecutionValue", () => {
    beforeEach(() => {
      param.setValue(moment("2019-10-06 10:00:00"));
    });

    test("formats value as a string date", () => {
      const executionValue = param.getExecutionValue();
      expect(executionValue).toBe("2019-10-06");
    });

    describe("type is datetime-local", () => {
      beforeAll(() => {
        type = "datetime-local";
      });

      test("formats value as a string datetime", () => {
        const executionValue = param.getExecutionValue();
        expect(executionValue).toBe("2019-10-06 10:00");
      });
    });

    describe("type is datetime-with-seconds", () => {
      beforeAll(() => {
        type = "datetime-with-seconds";
      });

      test("formats value as a string datetime with seconds", () => {
        const executionValue = param.getExecutionValue();
        expect(executionValue).toBe("2019-10-06 10:00:00");
      });
    });
  });

  describe("normalizeValue", () => {
    test("recognizes dates from strings", () => {
      const normalizedValue = param.normalizeValue("2019-10-06");
      expect(moment.isMoment(normalizedValue)).toBeTruthy();
      expect(normalizedValue.format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    test("recognizes dates from moment values", () => {
      const normalizedValue = param.normalizeValue(moment("2019-10-06"));
      expect(moment.isMoment(normalizedValue)).toBeTruthy();
      expect(normalizedValue.format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    test("normalizes unrecognized values as null", () => {
      const normalizedValue = param.normalizeValue("value");
      expect(normalizedValue).toBeNull();
    });

    describe("Dynamic values", () => {
      test("recognizes dynamic values from string index", () => {
        const normalizedValue = param.normalizeValue("d_now");
        expect(normalizedValue).not.toBeNull();
        expect(normalizedValue).toEqual(getDynamicDateFromString("d_now"));
      });

      test("recognizes dynamic values from a dynamic date", () => {
        const dynamicDate = getDynamicDateFromString("d_now");
        const normalizedValue = param.normalizeValue(dynamicDate);
        expect(normalizedValue).not.toBeNull();
        expect(normalizedValue).toEqual(dynamicDate);
      });
    });
  });
});
