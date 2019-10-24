import React from 'react';
import enzyme from 'enzyme';

import getOptions from '../getOptions';
import GeneralSettings from './GeneralSettings';

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function elementExists(wrapper, testId) {
  return findByTestID(wrapper, testId).length > 0;
}

function mount(options, done) {
  options = getOptions(options);
  return enzyme.mount((
    <GeneralSettings
      visualizationName="Test"
      data={{ columns: [], rows: [] }}
      options={options}
      onOptionsChange={(changedOptions) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  ));
}

describe('Visualizations -> Chart -> Editor -> General Settings', () => {
  test('Changes global series type', (done) => {
    const el = mount({
      globalSeriesType: 'column',
      showDataLabels: false,
      seriesOptions: {
        a: { type: 'column' },
        b: { type: 'line' },
      },
    }, done);

    findByTestID(el, 'Chart.GlobalSeriesType').first().simulate('click');
    findByTestID(el, 'Chart.ChartType.pie').first().simulate('click');
  });

  test('Pie: changes direction', (done) => {
    const el = mount({
      globalSeriesType: 'pie',
      direction: { type: 'counterclockwise' },
    }, done);

    findByTestID(el, 'Chart.PieDirection').first().simulate('click');
    findByTestID(el, 'Chart.PieDirection.Clockwise').first().simulate('click');
  });

  test('Toggles legend', (done) => {
    const el = mount({
      globalSeriesType: 'column',
      legend: { enabled: true },
    }, done);

    findByTestID(el, 'Chart.ShowLegend').first().find('input')
      .simulate('change', { target: { checked: false } });
  });

  test('Box: toggles show points', (done) => {
    const el = mount({
      globalSeriesType: 'box',
      showpoints: false,
    }, done);

    findByTestID(el, 'Chart.ShowPoints').first().find('input')
      .simulate('change', { target: { checked: true } });
  });

  test('Enables stacking', (done) => {
    const el = mount({
      globalSeriesType: 'column',
      series: {},
    }, done);

    findByTestID(el, 'Chart.Stacking').first().simulate('click');
    findByTestID(el, 'Chart.Stacking.Stack').first().simulate('click');
  });

  test('Toggles normalize values to percentage', (done) => {
    const el = mount({
      globalSeriesType: 'column',
      series: {},
    }, done);

    findByTestID(el, 'Chart.NormalizeValues').first().find('input')
      .simulate('change', { target: { checked: true } });
  });

  test('Keep missing/null values', (done) => {
    const el = mount({
      globalSeriesType: 'column',
      missingValuesAsZero: true,
    }, done);

    findByTestID(el, 'Chart.MissingValues').first().simulate('click');
    findByTestID(el, 'Chart.MissingValues.Keep').first().simulate('click');
  });

  describe('Column mappings should be available', () => {
    test('for bubble', () => {
      const el = mount({
        globalSeriesType: 'column',
        seriesOptions: {
          a: { type: 'column' },
          b: { type: 'bubble' },
          c: { type: 'heatmap' },
        },
      });

      expect(elementExists(el, 'Chart.ColumnMapping.x')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.y')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.size')).toBeTruthy();
    });

    test('for heatmap', () => {
      const el = mount({
        globalSeriesType: 'column',
        seriesOptions: {
          a: { type: 'column' },
          b: { type: 'bubble' },
          c: { type: 'heatmap' },
        },
      });

      expect(elementExists(el, 'Chart.ColumnMapping.x')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.y')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.zVal')).toBeTruthy();
    });

    test('for all types except of bubble, heatmap and custom', () => {
      const el = mount({
        globalSeriesType: 'column',
        seriesOptions: {
          a: { type: 'column' },
          b: { type: 'bubble' },
          c: { type: 'heatmap' },
        },
      });

      expect(elementExists(el, 'Chart.ColumnMapping.x')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.y')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.series')).toBeTruthy();
      expect(elementExists(el, 'Chart.ColumnMapping.yError')).toBeTruthy();
    });
  });
});
