import { Parameter } from "..";
import { getDynamicDateRangeFromString } from "../DateRangeParameter";
import moment from "moment";

describe("DateRangeParameter", () => {
  let type = "date-range";
  let param;

  beforeEach(() => {
    param = Parameter.create({ name: "param", title: "Param", type });
  });

  describe("getExecutionValue", () => {
    beforeEach(() => {
      param.setValue({ start: "2019-10-05 10:00:00", end: "2019-10-06 09:59:59" });
    });

    test("formats value as a string date", () => {
      const executionValue = param.getExecutionValue();
      expect(executionValue).toEqual({ start: "2019-10-05", end: "2019-10-06" });
    });

    describe("type is datetime-range", () => {
      beforeAll(() => {
        type = "datetime-range";
      });

      test("formats value as a string datetime", () => {
        const executionValue = param.getExecutionValue();
        expect(executionValue).toEqual({ start: "2019-10-05 10:00", end: "2019-10-06 09:59" });
      });
    });

    describe("type is datetime-range-with-seconds", () => {
      beforeAll(() => {
        type = "datetime-range-with-seconds";
      });

      test("formats value as a string datetime with seconds", () => {
        const executionValue = param.getExecutionValue();
        expect(executionValue).toEqual({ start: "2019-10-05 10:00:00", end: "2019-10-06 09:59:59" });
      });
    });
  });

  describe("normalizeValue", () => {
    test("recognizes dates from moment arrays", () => {
      const normalizedValue = param.normalizeValue([moment("2019-10-05"), moment("2019-10-06")]);
      expect(normalizedValue).toHaveLength(2);
      expect(normalizedValue[0].format("YYYY-MM-DD")).toBe("2019-10-05");
      expect(normalizedValue[1].format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    test("recognizes dates from object", () => {
      const normalizedValue = param.normalizeValue({ start: "2019-10-05", end: "2019-10-06" });
      expect(normalizedValue).toHaveLength(2);
      expect(normalizedValue[0].format("YYYY-MM-DD")).toBe("2019-10-05");
      expect(normalizedValue[1].format("YYYY-MM-DD")).toBe("2019-10-06");
    });

    describe("Dynamic values", () => {
      test("recognizes dynamic values from string index", () => {
        const normalizedValue = param.normalizeValue("d_last_week");
        expect(normalizedValue).not.toBeNull();
        expect(normalizedValue).toEqual(getDynamicDateRangeFromString("d_last_week"));
      });

      test("recognizes dynamic values from a dynamic date range", () => {
        const dynamicDateRange = getDynamicDateRangeFromString("d_last_week");
        const normalizedValue = param.normalizeValue(dynamicDateRange);
        expect(normalizedValue).not.toBeNull();
        expect(normalizedValue).toEqual(dynamicDateRange);
      });
    });
  });
});
