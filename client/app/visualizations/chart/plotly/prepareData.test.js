/* eslint-disable global-require, import/no-unresolved */
import prepareData from './prepareData';

function cleanSeries(series) {
  return series.map(({ sourceData, ...rest }) => rest);
}

describe('Visualizations', () => {
  describe('Chart', () => {
    describe('prepareData', () => {
      test.skip('Template', () => {
        const { input, output } = require('./fixtures/prepareData/template');
        const series = prepareData(input.data, input.options);
        expect(series).toEqual(output.series);
      });

      describe('heatmap', () => {
        test('default', () => {
          const { input, output } = require('./fixtures/prepareData/heatmap/default');
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test('sorted', () => {
          const { input, output } = require('./fixtures/prepareData/heatmap/sorted');
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test('reversed', () => {
          const { input, output } = require('./fixtures/prepareData/heatmap/reversed');
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test('sorted & reversed', () => {
          const { input, output } = require('./fixtures/prepareData/heatmap/sorted');
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
        test('with labels', () => {
          const { input, output } = require('./fixtures/prepareData/heatmap/with-labels');
          const series = prepareData(input.data, input.options);
          expect(series).toEqual(output.series);
        });
      });

      describe('pie', () => {
        test('default', () => {
          const { input, output } = require('./fixtures/prepareData/pie/default');
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test('without X mapped', () => {
          const { input, output } = require('./fixtures/prepareData/pie/without-x');
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test('without labels', () => {
          const { input, output } = require('./fixtures/prepareData/pie/without-labels');
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });

        test('custom tooltip', () => {
          const { input, output } = require('./fixtures/prepareData/pie/custom-tooltip');
          const series = cleanSeries(prepareData(input.data, input.options));
          expect(series).toEqual(output.series);
        });
      });
    });
  });
});
