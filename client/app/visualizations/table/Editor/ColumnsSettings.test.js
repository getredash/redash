import React from 'react';
import enzyme from 'enzyme';

import getOptions from '../getOptions';
import ColumnsSettings from './ColumnsSettings';

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(options, done) {
  const data = {
    columns: [{ name: 'a', type: 'string' }],
    rows: [{ a: 'test' }],
  };
  options = getOptions(options, data);
  return enzyme.mount((
    <ColumnsSettings
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={(changedOptions) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  ));
}

describe('Visualizations -> Table -> Editor -> Columns Settings', () => {
  test('Toggles column visibility', (done) => {
    const el = mount({}, done);

    findByTestID(el, 'Table.Column.a.Visibility').first().simulate('click');
  });

  test('Changes column title', (done) => {
    const el = mount({}, done);
    findByTestID(el, 'Table.Column.a.Name').first().simulate('click'); // expand settings

    findByTestID(el, 'Table.Column.a.Title').first().simulate('change', { target: { value: 'test' } });
  });

  test('Changes column alignment', (done) => {
    const el = mount({}, done);
    findByTestID(el, 'Table.Column.a.Name').first().simulate('click'); // expand settings

    findByTestID(el, 'Table.Column.a.AlignRight').first().find('input')
      .simulate('change', { target: { checked: true } });
  });

  test('Enables search by column data', (done) => {
    const el = mount({}, done);
    findByTestID(el, 'Table.Column.a.Name').first().simulate('click'); // expand settings

    findByTestID(el, 'Table.Column.a.UseForSearch').first().find('input')
      .simulate('change', { target: { checked: true } });
  });

  test('Changes column display type', (done) => {
    const el = mount({}, done);
    findByTestID(el, 'Table.Column.a.Name').first().simulate('click'); // expand settings

    findByTestID(el, 'Table.Column.a.DisplayAs').first().simulate('click');
    findByTestID(el, 'Table.Column.a.DisplayAs.number').first().simulate('click');
  });
});
