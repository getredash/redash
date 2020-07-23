/* eslint-disable global-require, import/no-unresolved */
import getChartData from "./getChartData";

describe("Visualizations", () => {
  describe("Chart", () => {
    describe("getChartData", () => {
      test("Single series", () => {
        const { input, output } = require("./fixtures/getChartData/single-series");
        const data = getChartData(input.data, input.options);
        expect(data).toEqual(output.data);
      });

      test("Multiple series: multiple Y mappings", () => {
        const { input, output } = require("./fixtures/getChartData/multiple-series-multiple-y");
        const data = getChartData(input.data, input.options);
        expect(data).toEqual(output.data);
      });

      test("Multiple series: grouped", () => {
        const { input, output } = require("./fixtures/getChartData/multiple-series-grouped");
        const data = getChartData(input.data, input.options);
        expect(data).toEqual(output.data);
      });

      test("Multiple series: sorted", () => {
        const { input, output } = require("./fixtures/getChartData/multiple-series-sorted");
        const data = getChartData(input.data, input.options);
        expect(data).toEqual(output.data);
      });
    });
  });
});
