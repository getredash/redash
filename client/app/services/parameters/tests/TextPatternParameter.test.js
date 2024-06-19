import { createParameter } from "..";

describe("TextPatternParameter", () => {
  let param;

  beforeEach(() => {
    param = createParameter({ name: "param", title: "Param", type: "text-pattern", regex: "a+" });
  });

  describe("noramlizeValue", () => {
    test("converts matching strings", () => {
      const normalizedValue = param.normalizeValue("art");
      expect(normalizedValue).toBe("art");
    });

    test("returns null when string does not match pattern", () => {
      const normalizedValue = param.normalizeValue("brt");
      expect(normalizedValue).toBeNull();
    });
  });
});
