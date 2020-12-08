import { createParameter } from "..";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("TextParameter", () => {
  let param: any;

  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
  beforeEach(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter({ name: "param", title: "Param", type: "text" });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("normalizeValue", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("converts Strings", () => {
      const normalizedValue = param.normalizeValue("exampleString");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe("exampleString");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("converts Numbers", () => {
      const normalizedValue = param.normalizeValue(3);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe("3");
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
    describe("Empty values", () => {
      const emptyValues = [null, undefined, ""];

      // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
      test.each(emptyValues)("normalizes empty value '%s' as null", (emptyValue: any) => {
        const normalizedValue = param.normalizeValue(emptyValue);
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
        expect(normalizedValue).toBeNull();
      });
    });
  });
});
