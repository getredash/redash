import { createParameter } from "..";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("NumberParameter", () => {
  let param: any;

  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
  beforeEach(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter({ name: "param", title: "Param", type: "number" });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("normalizeValue", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("converts Strings", () => {
      const normalizedValue = param.normalizeValue("15");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe(15);
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("converts Numbers", () => {
      const normalizedValue = param.normalizeValue(42);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBe(42);
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("returns null when not possible to convert to number", () => {
      const normalizedValue = param.normalizeValue("notanumber");
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(normalizedValue).toBeNull();
    });
  });
});
