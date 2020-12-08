import {
  createParameter,
  TextParameter,
  NumberParameter,
  EnumParameter,
  QueryBasedDropdownParameter,
  DateParameter,
  DateRangeParameter,
} from "..";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("Parameter", () => {
  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
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

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test.each(parameterTypes)("when type is '%s' creates a %p", (type: any, expectedClass: any) => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const parameter = createParameter({ name: "param", title: "Param", type });
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(parameter).toBeInstanceOf(expectedClass);
    });
  });
});
