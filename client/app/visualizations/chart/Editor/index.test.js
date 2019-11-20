import React from 'react';
import enzyme from 'enzyme';

import getOptions from '../getOptions';
import Editor from './index';

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function elementExists(wrapper, testId) {
  return findByTestID(wrapper, testId).length > 0;
}

function mount(options, data) {
  options = getOptions(options);
  return enzyme.mount((
    <Editor
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={() => {}}
    />
  ));
}

describe('Visualizations -> Chart -> Editor (wrapper)', () => {
  test('Renders generic wrapper', () => {
    const el = mount({ globalSeriesType: 'column' }, { columns: [], rows: [] });

    expect(elementExists(el, 'Chart.EditorTabs.General')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.XAxis')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.YAxis')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.Series')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.Colors')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.DataLabels')).toBeTruthy();

    expect(elementExists(el, 'Chart.GlobalSeriesType')).toBeTruthy(); // general settings block exists
    expect(elementExists(el, 'Chart.Custom.Code')).toBeFalsy(); // custom settings block does not exist
  });

  test('Renders wrapper for custom charts', () => {
    const el = mount({ globalSeriesType: 'custom' }, { columns: [], rows: [] });

    expect(elementExists(el, 'Chart.EditorTabs.General')).toBeTruthy();
    expect(elementExists(el, 'Chart.EditorTabs.XAxis')).toBeFalsy();
    expect(elementExists(el, 'Chart.EditorTabs.YAxis')).toBeFalsy();
    expect(elementExists(el, 'Chart.EditorTabs.Series')).toBeFalsy();
    expect(elementExists(el, 'Chart.EditorTabs.Colors')).toBeFalsy();
    expect(elementExists(el, 'Chart.EditorTabs.DataLabels')).toBeFalsy();

    expect(elementExists(el, 'Chart.GlobalSeriesType')).toBeTruthy(); // general settings block exists
    expect(elementExists(el, 'Chart.Custom.Code')).toBeTruthy(); // custom settings block exists
  });
});
