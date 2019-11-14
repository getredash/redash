import { map } from 'lodash';
import React, { useMemo } from 'react';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';
import { inferCountryCodeType } from './utils';

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const countryCodeTypes = useMemo(() => {
    switch (options.mapType) {
      case 'countries':
        return {
          name: 'Short name',
          name_long: 'Full name',
          abbrev: 'Abbreviated name',
          iso_a2: 'ISO code (2 letters)',
          iso_a3: 'ISO code (3 letters)',
          iso_n3: 'ISO code (3 digits)',
        };
      case 'subdiv_japan':
        return {
          name: 'Name',
          name_local: 'Name (local)',
          iso_3166_2: 'ISO-3166-2',
        };
      default:
        return {};
    }
  }, [options.mapType]);

  const handleChangeAndInferType = (newOptions) => {
    newOptions.countryCodeType = inferCountryCodeType(
      newOptions.mapType || options.mapType,
      data ? data.rows : [],
      newOptions.countryCodeColumn || options.countryCodeColumn,
    ) || options.countryCodeType;
    onOptionsChange(newOptions);
  };

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="choropleth-editor-map-type">Map type</label>
        <Select
          id="choropleth-editor-map-type"
          className="w-100"
          defaultValue={options.mapType}
          onChange={mapType => handleChangeAndInferType({ mapType })}
        >
          <Select.Option key="countries">Countries</Select.Option>
          <Select.Option key="subdiv_japan">Japan/Prefectures</Select.Option>
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-key-column">Key column</label>
        <Select
          id="choropleth-editor-key-column"
          className="w-100"
          defaultValue={options.countryCodeColumn}
          onChange={countryCodeColumn => handleChangeAndInferType({ countryCodeColumn })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name}>{name}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-key-type">Key type</label>
        <Select
          id="choropleth-editor-key-type"
          className="w-100"
          value={options.countryCodeType}
          onChange={countryCodeType => onOptionsChange({ countryCodeType })}
        >
          {map(countryCodeTypes, (name, type) => (
            <Select.Option key={type}>{name}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-value-column">Value column</label>
        <Select
          id="choropleth-editor-value-column"
          className="w-100"
          defaultValue={options.valueColumn}
          onChange={valueColumn => onOptionsChange({ valueColumn })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name}>{name}</Select.Option>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
