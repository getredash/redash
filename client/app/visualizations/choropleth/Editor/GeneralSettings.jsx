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
          data-test="Choropleth.Editor.MapType"
          defaultValue={options.mapType}
          onChange={mapType => handleChangeAndInferType({ mapType })}
        >
          <Select.Option key="countries" data-test="Choropleth.Editor.MapType.Countries">Countries</Select.Option>
          <Select.Option key="subdiv_japan" data-test="Choropleth.Editor.MapType.Japan">Japan/Prefectures</Select.Option>
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-key-column">Key column</label>
        <Select
          id="choropleth-editor-key-column"
          className="w-100"
          data-test="Choropleth.Editor.KeyColumn"
          defaultValue={options.countryCodeColumn}
          onChange={countryCodeColumn => handleChangeAndInferType({ countryCodeColumn })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name} data-test={`Choropleth.Editor.KeyColumn.${name}`}>{name}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-key-type">Key type</label>
        <Select
          id="choropleth-editor-key-type"
          className="w-100"
          data-test="Choropleth.Editor.KeyType"
          value={options.countryCodeType}
          onChange={countryCodeType => onOptionsChange({ countryCodeType })}
        >
          {map(countryCodeTypes, (name, type) => (
            <Select.Option key={type} data-test={`Choropleth.Editor.KeyType.${type}`}>{name}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-value-column">Value column</label>
        <Select
          id="choropleth-editor-value-column"
          className="w-100"
          data-test="Choropleth.Editor.ValueColumn"
          defaultValue={options.valueColumn}
          onChange={valueColumn => onOptionsChange({ valueColumn })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name} data-test={`Choropleth.Editor.ValueColumn.${name}`}>{name}</Select.Option>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
