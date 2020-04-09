/* eslint-disable global-require, import/no-unresolved */
import prepareData from "./prepareData";

function cleanSeries(series) {
  return series.map(({ sourceData, ...rest }) => rest);
}

describe("Visualizations", () => {
  describe("Chart", () => {
    describe("prepareData", () => {
      describe("heatmap", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/heatmap/default");
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test("sorted", () => {
          const { input, output } = require("./fixtures/prepareData/heatmap/sorted");
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test("reversed", () => {
          const { input, output } = require("./fixtures/prepareData/heatmap/reversed");
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test("sorted & reversed", () => {
          const { input, output } = require("./fixtures/prepareData/heatmap/sorted");
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test("with labels", () => {
          const { input, output } = require("./fixtures/prepareData/heatmap/with-labels");
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
      });

      describe("pie", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/pie/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("without X mapped", () => {
          const { input, output } = require("./fixtures/prepareData/pie/without-x");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("without labels", () => {
          const { input, output } = require("./fixtures/prepareData/pie/without-labels");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("custom tooltip", () => {
          const { input, output } = require("./fixtures/prepareData/pie/custom-tooltip");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });

      describe("bar (column)", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/bar/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("stacked", () => {
          const { input, output } = require("./fixtures/prepareData/bar/stacked");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("normalized values", () => {
          const { input, output } = require("./fixtures/prepareData/bar/normalized");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });

      describe("lines & area", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("stacked", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/stacked");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("normalized values", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/normalized");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("stacked & normalized values", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/normalized-stacked");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("keep missing values", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/keep-missing-values");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("convert missing values to 0", () => {
          const { input, output } = require("./fixtures/prepareData/line-area/missing-values-0");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });

      describe("scatter", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/scatter/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("without labels", () => {
          const { input, output } = require("./fixtures/prepareData/scatter/without-labels");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });

      describe("bubble", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/bubble/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });

      describe("box", () => {
        test("default", () => {
          const { input, output } = require("./fixtures/prepareData/box/default");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test("with points", () => {
          const { input, output } = require("./fixtures/prepareData/box/with-points");
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });
    });
  });
});
