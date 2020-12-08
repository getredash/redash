import { createParameter } from "..";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("EnumParameter", () => {
  let param: any;
  let multiValuesOptions: any = null;
  const enumOptions = "value1\nvalue2\nvalue3\nvalue4";

  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
  beforeEach(() => {
    const paramOptions = {
      name: "param",
      title: "Param",
      type: "enum",
      enumOptions,
      multiValuesOptions,
    };
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter(paramOptions);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("normalizeValue", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("returns the value when the input in the enum options", () => {
      const normalizedValue = param.normalizeValue("value2");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe("value2");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("returns the first value when the input is not in the enum options", () => {
      const normalizedValue = param.normalizeValue("anything");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe("value1");
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("Multi-valued", () => {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeAll'.
    beforeAll(() => {
      multiValuesOptions = { prefix: '"', suffix: '"', separator: "," };
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("normalizeValue", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("returns only valid values", () => {
        const normalizedValue = param.normalizeValue(["value3", "anything", null]);
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toEqual(["value3"]);
      });

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("normalizes empty values as null", () => {
        const normalizedValue = param.normalizeValue([]);
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toBeNull();
      });
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("getExecutionValue", () => {
      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test("joins values when joinListValues is truthy", () => {
        param.setValue(["value1", "value3"]);
        const executionValue = param.getExecutionValue({ joinListValues: true });
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(executionValue).toBe('"value1","value3"');
      });
    });
  });
});
