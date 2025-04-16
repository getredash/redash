import {
  createParameter,
  TextParameter,
  TextPatternParameter,
  NumberParameter,
  EnumParameter,
  QueryBasedDropdownParameter,
  DateParameter,
  DateRangeParameter,
} from "..";

describe("Parameter", () => {
  describe("create", () => {
    const parameterTypes = [
      ["text", TextParameter],
      ["text-pattern", TextPatternParameter],
      ["number", NumberParameter],
      ["enum", EnumParameter],
      ["query", QueryBasedDropdownParameter],
      ["date", DateParameter],
      ["datetime-local", DateParameter],
      ["datetime-with-seconds", DateParameter],
      ["date-range", DateRangeParameter],
      ["datetime-range", DateRangeParameter],
      ["datetime-range-with-seconds", DateRangeParameter],
      [null, TextParameter],
    ];

    test.each(parameterTypes)("when type is '%s' creates a %p", (type, expectedClass) => {
      const parameter = createParameter({ name: "param", title: "Param", type });
      expect(parameter).toBeInstanceOf(expectedClass);
    });
  });
});
