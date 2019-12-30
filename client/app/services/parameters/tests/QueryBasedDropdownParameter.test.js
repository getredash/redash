import { Parameter } from "..";

describe("QueryBasedDropdownParameter", () => {
  let param;
  let multiValuesOptions = null;

  beforeEach(() => {
    const paramOptions = {
      name: "param",
      title: "Param",
      type: "query",
      queryId: 1,
      multiValuesOptions,
    };
    param = Parameter.create(paramOptions);
  });

  describe("normalizeValue", () => {
    test("returns the value when the input in the enum options", () => {
      const normalizedValue = param.normalizeValue("value2");
      expect(normalizedValue).toBe("value2");
    });

    describe("Empty values", () => {
      const emptyValues = [null, undefined, []];

      test.each(emptyValues)("normalizes empty value '%s' as null", emptyValue => {
        const normalizedValue = param.normalizeValue(emptyValue);
        expect(normalizedValue).toBeNull();
      });
    });
  });

  describe("Multi-valued", () => {
    beforeAll(() => {
      multiValuesOptions = { prefix: '"', suffix: '"', separator: "," };
    });

    describe("normalizeValue", () => {
      test("returns an array with the input when input is not an array", () => {
        const normalizedValue = param.normalizeValue("value");
        expect(normalizedValue).toEqual(["value"]);
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
