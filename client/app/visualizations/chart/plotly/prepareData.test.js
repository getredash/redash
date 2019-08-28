/* eslint-disable global-require, import/no-unresolved */
import prepareData from './prepareData';

describe('Visualizations', () => {
  describe('Chart', () => {
    describe('prepareData', () => {
      test.skip('Template', () => {
        const { input, output } = require('./fixtures/prepareLayout/box-with-second-axis');
        const series = prepareData(input.data, input.options);
        expect(series).toEqual(output.series);
      });

      describe('Heatmap', () => {
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
    });
  });
});
