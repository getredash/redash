import getCounterData from "./getCounterData";

describe("Visualizations", () => {
  describe("Counter", () => {
    describe("getCounterData", () => {
      test("Uses Default Counter Label", () => {
        const { input, output } = require("./fixtures/getCounterData/uses-default-counter-label");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data.counterLabel).toEqual(output.counterLabel);
      });

      test("Uses Custom Counter Label", () => {
        const { input, output } = require("./fixtures/getCounterData/uses-custom-counter-label");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data.counterLabel).toEqual(output.counterLabel);
      });

      test("Uses Custom Number Format", () => {
        const { input, output } = require("./fixtures/getCounterData/uses-custom-number-format");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      test("Trend Positive", () => {
        const { input, output } = require("./fixtures/getCounterData/trend-positive");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      test("Trend Negative", () => {
        const { input, output } = require("./fixtures/getCounterData/trend-negative");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      test("Display and Tooltip Format", () => {
        const { input, output } = require("./fixtures/getCounterData/display-and-tooltip-format");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      test("Hide Tooltip", () => {
        const { input, output } = require("./fixtures/getCounterData/hide-tooltip");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      test("Different Types of Primary and Secondary Values", () => {
        const { input, output } = require("./fixtures/getCounterData/primary-secondary-different-types");
        const data = getCounterData(input.data, input.options, input.visualizationName);
        expect(data).toEqual(output);
      });

      describe("Counter Types", () => {
        describe("Unused", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/unused/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });

        describe("Row Value", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/rowValue/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Invalid Column", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/rowValue/invalid-column");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Zero Row Number", () => {
            // special case - take first row
            const { input, output } = require("./fixtures/getCounterData/counter-types/rowValue/zero-row-number");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Positive Row Number", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/rowValue/positive-row-number");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Positive Row Number (Wrapped)", () => {
            const {
              input,
              output,
            } = require("./fixtures/getCounterData/counter-types/rowValue/wrapped-positive-row-number");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Negative Row Number", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/rowValue/negative-row-number");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Negative Row Number (Wrapped)", () => {
            const {
              input,
              output,
            } = require("./fixtures/getCounterData/counter-types/rowValue/wrapped-negative-row-number");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });

        describe("Count Rows", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/countRows/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });

        describe("Sum Values", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/sumRows/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Invalid Column", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/sumRows/invalid-column");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });

        describe("Min Value", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/minValue/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Invalid Column", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/minValue/invalid-column");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });

        describe("Max Value", () => {
          test("Default", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/maxValue/default");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });

          test("Invalid Column", () => {
            const { input, output } = require("./fixtures/getCounterData/counter-types/maxValue/invalid-column");
            const data = getCounterData(input.data, input.options, input.visualizationName);
            expect(data).toEqual(output);
          });
        });
      });
    });
  });
});
