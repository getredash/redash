import { createParameter } from "..";

describe("TextParameter", () => {
  let param: any;

  beforeEach(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter({ name: "param", title: "Param", type: "text" });
  });

  describe("normalizeValue", () => {
    test("converts Strings", () => {
      const normalizedValue = param.normalizeValue("exampleString");
      expect(normalizedValue).toBe("exampleString");
    });

    test("converts Numbers", () => {
      const normalizedValue = param.normalizeValue(3);
      expect(normalizedValue).toBe("3");
    });

    describe("Empty values", () => {
      const emptyValues = [null, undefined, ""];

      test.each(emptyValues)("normalizes empty value '%s' as null", emptyValue => {
        const normalizedValue = param.normalizeValue(emptyValue);
        expect(normalizedValue).toBeNull();
      });
    });
  });
});
