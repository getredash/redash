/* eslint-disable global-require, import/no-unresolved */
import getOptions from "../getOptions";
import prepareLayout from "./prepareLayout";

const fakeElement = { offsetWidth: 400, offsetHeight: 300 };

describe("Visualizations", () => {
  describe("Chart", () => {
    describe("prepareLayout", () => {
      test("Pie", () => {
        const { input, output } = require("./fixtures/prepareLayout/pie");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Pie without annotations", () => {
        const { input, output } = require("./fixtures/prepareLayout/pie-without-annotations");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Pie with multiple series", () => {
        const { input, output } = require("./fixtures/prepareLayout/pie-multiple-series");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Box with single Y axis", () => {
        const { input, output } = require("./fixtures/prepareLayout/box-single-axis");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Box with second Y axis", () => {
        const { input, output } = require("./fixtures/prepareLayout/box-with-second-axis");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Default with single Y axis", () => {
        const { input, output } = require("./fixtures/prepareLayout/default-single-axis");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Default with second Y axis", () => {
        const { input, output } = require("./fixtures/prepareLayout/default-with-second-axis");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Default without legend", () => {
        const { input, output } = require("./fixtures/prepareLayout/default-without-legend");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });

      test("Default with stacking", () => {
        const { input, output } = require("./fixtures/prepareLayout/default-with-stacking");
        const layout = prepareLayout(fakeElement, getOptions(input.options), input.series);
        expect(layout).toEqual(output.layout);
      });
    });
  });
});
