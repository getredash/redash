import { Parameter } from "..";

describe("EnumParameter", () => {
  let param;
  let multiValuesOptions = null;
  const enumOptions = "value1\nvalue2\nvalue3\nvalue4";

  beforeEach(() => {
    const paramOptions = {
      name: "param",
      title: "Param",
      type: "enum",
      enumOptions,
      multiValuesOptions,
    };
    param = Parameter.create(paramOptions);
  });

  describe("normalizeValue", () => {
    test("returns the value when the input in the enum options", () => {
      const normalizedValue = param.normalizeValue("value2");
      expect(normalizedValue).toBe("value2");
    });

    test("returns the first value when the input is not in the enum options", () => {
      const normalizedValue = param.normalizeValue("anything");
      expect(normalizedValue).toBe("value1");
    });
  });

  describe("Multi-valued", () => {
    beforeAll(() => {
      multiValuesOptions = { prefix: '"', suffix: '"', separator: "," };
    });

    describe("normalizeValue", () => {
      test("returns only valid values", () => {
        const normalizedValue = param.normalizeValue(["value3", "anything", null]);
        expect(normalizedValue).toEqual(["value3"]);
      });

      test("normalizes empty values as null", () => {
        const normalizedValue = param.normalizeValue([]);
        expect(normalizedValue).toBeNull();
      });
    });

    describe("getExecutionValue", () => {
      test("joins values when joinListValues is truthy", () => {
        param.setValue(["value1", "value3"]);
        const executionValue = param.getExecutionValue({ joinListValues: true });
        expect(executionValue).toBe('"value1","value3"');
      });
    });
  });
});
