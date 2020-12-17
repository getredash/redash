import { createParameter } from "..";

describe("NumberParameter", () => {
  let param: any;

  beforeEach(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    param = createParameter({ name: "param", title: "Param", type: "number" });
  });

  describe("normalizeValue", () => {
    test("converts Strings", () => {
      const normalizedValue = param.normalizeValue("15");
      expect(normalizedValue).toBe(15);
    });

    test("converts Numbers", () => {
      const normalizedValue = param.normalizeValue(42);
      expect(normalizedValue).toBe(42);
    });

    test("returns null when not possible to convert to number", () => {
      const normalizedValue = param.normalizeValue("notanumber");
      expect(normalizedValue).toBeNull();
    });
  });
});
