import { map } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

const ALLOWED_ITEM_PER_PAGE = [5, 10, 15, 20, 25, 50, 100, 150, 200, 250];

export default function GridSettings({ options, onOptionsChange }) {
  return (
    <Section>
      <label htmlFor="table-editor-items-per-page">Items per page</label>
      <Select
        id="table-editor-items-per-page"
        data-test="Table.ItemsPerPage"
        className="w-100"
        defaultValue={options.itemsPerPage}
        onChange={itemsPerPage => onOptionsChange({ itemsPerPage })}
      >
        {map(ALLOWED_ITEM_PER_PAGE, value => (
          <Select.Option key={`ipp${value}`} value={value} data-test={`Table.ItemsPerPage.${value}`}>{value}</Select.Option>
        ))}
      </Select>
    </Section>
  );
}

GridSettings.propTypes = EditorPropTypes;
