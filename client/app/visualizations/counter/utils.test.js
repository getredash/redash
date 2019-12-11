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
      visualisationName: "Visualisation Name",
      result: {
        counterLabel: "Visualisation Name",
        counterValue: "",
        targetValue: null,
        counterValueTooltip: "",
        targetValueTooltip: "",
      },
    };
  });

  describe("getCounterData()", () => {
    describe('"Count rows" option is disabled', () => {
      test("No target and counter values return empty result", () => {
        const result = getCounterData(dummy.rows, dummy.options, dummy.visualisationName);
        expect(result).toEqual({
          ...dummy.result,
          showTrend: false,
        });
      });

      test('"Counter label" overrides vizualization name', () => {
        const result = getCounterData(dummy.rows, { counterLabel: "Counter Label" }, dummy.visualisationName);
        expect(result).toEqual({
          ...dummy.result,
          counterLabel: "Counter Label",
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" must be set to a correct non empty value', () => {
        const result = getCounterData(dummy.rows, { rowNumber: 3 }, dummy.visualisationName);
        expect(result).toEqual({
          ...dummy.result,
          showTrend: false,
        });

        const result2 = getCounterData(dummy.rows, { counterColName: "missingColumn" }, dummy.visualisationName);
        expect(result2).toEqual({
          ...dummy.result,
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" uses correct column', () => {
        const result = getCounterData(dummy.rows, { counterColName: "population" }, dummy.visualisationName);
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
          dummy.visualisationName
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
          dummy.visualisationName
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

    describe('"Count rows" option is enabled', () => {
      beforeEach(() => {
        dummy.result = {
          ...dummy.result,
          counterValue: "3.000",
          counterValueTooltip: "3",
          showTrend: false,
        };
      });

      test("Rows are counted correctly", () => {
        const result = getCounterData(dummy.rows, { countRow: true }, dummy.visualisationName);
        expect(result).toEqual(dummy.result);
      });

      test("Counter value is ignored", () => {
        const result = getCounterData(
          dummy.rows,
          {
            countRow: true,
            rowNumber: 3,
            counterColName: "population",
          },
          dummy.visualisationName
        );
        expect(result).toEqual(dummy.result);
      });

      test("Target value and trend are computed correctly", () => {
        const result = getCounterData(
          dummy.rows,
          {
            countRow: true,
            targetRowNumber: 2,
            targetColName: "population",
          },
          dummy.visualisationName
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
        const result = getCounterData([], { countRow: true }, dummy.visualisationName);
        expect(result).toEqual({
          ...dummy.result,
          counterValue: "0.000",
          counterValueTooltip: "0",
        });
      });
    });
  });
});
