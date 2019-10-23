import { isNil, map, filter, difference } from 'lodash';
import React, { useMemo } from 'react';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';

function getColumns(column, unusedColumns) {
  return filter(
    [column, ...unusedColumns],
    v => !isNil(v),
  );
}

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const unusedColumns = useMemo(
    () => difference(map(data.columns, c => c.name), [options.latColName, options.lonColName, options.classify]),
    [data, options.latColName, options.lonColName, options.classify],
  );

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="map-editor-latitude-column-name">Latitude Column Name</label>
        <Select
          data-test="Map.Editor.LatitudeColumnName"
          id="map-editor-latitude-column-name"
          className="w-100"
          value={options.latColName}
          onChange={latColName => onOptionsChange({ latColName })}
        >
          {map(getColumns(options.latColName, unusedColumns), col => (
            <Select.Option key={col} data-test={'Map.Editor.LatitudeColumnName.' + col}>{col}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="map-editor-longitude-column-name">Longitude Column Name</label>
        <Select
          data-test="Map.Editor.LongitudeColumnName"
          id="map-editor-longitude-column-name"
          className="w-100"
          value={options.lonColName}
          onChange={lonColName => onOptionsChange({ lonColName })}
        >
          {map(getColumns(options.lonColName, unusedColumns), col => (
            <Select.Option key={col} data-test={'Map.Editor.LongitudeColumnName.' + col}>{col}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label className="control-label" htmlFor="map-editor-group-by">Group By</label>
        <Select
          data-test="Map.Editor.GroupBy"
          id="map-editor-group-by"
          className="w-100"
          allowClear
          placeholder="none"
          value={options.classify || undefined}
          onChange={column => onOptionsChange({ classify: column || null })}
        >
          {map(getColumns(options.classify, unusedColumns), col => (
            <Select.Option key={col} data-test={'Map.Editor.GroupBy.' + col}>{col}</Select.Option>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
