import {
  createParameter,
  TextParameter,
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

    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '(type: string | typeof TextParam... Remove this comment to see the full error message
    test.each(parameterTypes)("when type is '%s' creates a %p", (type, expectedClass) => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const parameter = createParameter({ name: "param", title: "Param", type });
      expect(parameter).toBeInstanceOf(expectedClass);
    });
  });
});
