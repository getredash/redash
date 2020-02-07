import { getCounterData } from "./utils";

let dummy;

describe("Visualizations -> Counter -> Utils", () => {
  beforeEach(() => {
    dummy = {
      rows: [
        { city: "New York City", population: 18604000 },
        { city: "Shangai", population: 24484000 },
        { city: "Tokyo", population: 38140000 },
      ],
      options: {},
      visualizationName: "Visualization Name",
      result: {
        counterLabel: "Visualization Name",
        counterValue: "",
        targetValue: null,
        counterValueTooltip: "",
        targetValueTooltip: "",
      },
    };
  });

  describe("getCounterData()", () => {
    describe('Counter type is not "Count Rows"', () => {
      test("No target and counter values return empty result", () => {
        const result = getCounterData(dummy.rows, dummy.options, dummy.visualizationName);
        expect(result).toEqual({
          ...dummy.result,
          showTrend: false,
        });
      });

      test('"Counter label" overrides vizualization name', () => {
        const result = getCounterData(dummy.rows, { counterLabel: "Counter Label" }, dummy.visualizationName);
        expect(result).toEqual({
          ...dummy.result,
          counterLabel: "Counter Label",
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" must be set to a correct non empty value', () => {
        const result = getCounterData(dummy.rows, { rowNumber: 3 }, dummy.visualizationName);
        expect(result).toEqual({
          ...dummy.result,
          showTrend: false,
        });

        const result2 = getCounterData(dummy.rows, { counterColName: "missingColumn" }, dummy.visualizationName);
        expect(result2).toEqual({
          ...dummy.result,
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" uses correct column', () => {
        const result = getCounterData(dummy.rows, { counterColName: "population" }, dummy.visualizationName);
        expect(result).toEqual({
          ...dummy.result,
          counterValue: "18,604,000.000",
          counterValueTooltip: "18,604,000",
          showTrend: false,
        });
      });

      test("Counter and target values return correct result including trend", () => {
        const result = getCounterData(
          dummy.rows,
          {
            rowNumber: 1,
            counterColName: "population",
            targetRowNumber: 2,
            targetColName: "population",
          },
          dummy.visualizationName
        );
        expect(result).toEqual({
          ...dummy.result,
          counterValue: "18,604,000.000",
          counterValueTooltip: "18,604,000",
          targetValue: "24484000",
          targetValueTooltip: "24,484,000",
          showTrend: true,
          trendPositive: false,
        });

        const result2 = getCounterData(
          dummy.rows,
          {
            rowNumber: 2,
            counterColName: "population",
            targetRowNumber: 1,
            targetColName: "population",
          },
          dummy.visualizationName
        );
        expect(result2).toEqual({
          ...dummy.result,
          counterValue: "24,484,000.000",
          counterValueTooltip: "24,484,000",
          targetValue: "18604000",
          targetValueTooltip: "18,604,000",
          showTrend: true,
          trendPositive: true,
        });
      });
    });

    describe('Counter type is "Count Rows"', () => {
      beforeEach(() => {
        dummy.result = {
          ...dummy.result,
          counterValue: "3.000",
          counterValueTooltip: "3",
          showTrend: false,
        };
      });

      test("Rows are counted correctly", () => {
        const result = getCounterData(dummy.rows, { counterType: "countRows" }, dummy.visualizationName);
        expect(result).toEqual(dummy.result);
      });

      test("Counter value is ignored", () => {
        const result = getCounterData(
          dummy.rows,
          {
            counterType: "countRows",
            rowNumber: 3,
            counterColName: "population",
          },
          dummy.visualizationName
        );
        expect(result).toEqual(dummy.result);
      });

      test("Target value and trend are computed correctly", () => {
        const result = getCounterData(
          dummy.rows,
          {
            counterType: "countRows",
            targetRowNumber: 2,
            targetColName: "population",
          },
          dummy.visualizationName
        );
        expect(result).toEqual({
          ...dummy.result,
          targetValue: "24484000",
          targetValueTooltip: "24,484,000",
          showTrend: true,
          trendPositive: false,
        });
      });

      test("Empty rows return counter value 0", () => {
        const result = getCounterData([], { counterType: "countRows" }, dummy.visualizationName);
        expect(result).toEqual({
          ...dummy.result,
          counterValue: "0.000",
          counterValueTooltip: "0",
        });
      });
    });

    describe('Counter type is "Sum Values"', () => {
      beforeEach(() => {
        dummy.options = { counterType: "sumRows", counterColName: "population" };
        dummy.result = {
          ...dummy.result,
          counterValue: "81,228,000.000",
          counterValueTooltip: "81,228,000",
          showTrend: false,
        };
      });

      test("Rows are summed up correctly", () => {
        const result = getCounterData(dummy.rows, dummy.options, dummy.visualizationName);
        expect(result).toEqual(dummy.result);
      });
    });

    describe('Counter type is "Min Value"', () => {
      beforeEach(() => {
        dummy.options = { counterType: "minValue", counterColName: "population" };
        dummy.result = {
          ...dummy.result,
          counterValue: "18,604,000.000",
          counterValueTooltip: "18,604,000",
          showTrend: false,
        };
      });

      test("The min value from rows is returned", () => {
        const result = getCounterData(dummy.rows, dummy.options, dummy.visualizationName);
        expect(result).toEqual(dummy.result);
      });
    });

    describe('Counter type is "Max Value"', () => {
      beforeEach(() => {
        dummy.options = { counterType: "maxValue", counterColName: "population" };
        dummy.result = {
          ...dummy.result,
          counterValue: "38,140,000.000",
          counterValueTooltip: "38,140,000",
          showTrend: false,
        };
      });

      test("The max value from rows is returned", () => {
        const result = getCounterData(dummy.rows, dummy.options, dummy.visualizationName);
        expect(result).toEqual(dummy.result);
      });
    });
  });
});
