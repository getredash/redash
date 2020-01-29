import { isString, map, filter, find } from "lodash";
import React, { useMemo, useState, useCallback } from "react";
import * as Grid from "antd/lib/grid";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { Section, Select } from "@/components/visualizations/editor";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import availableMaps from "../maps";
import { getGeoJsonFields } from "./utils";

function getMapLabel(mapUrl) {
  const result = find(availableMaps, item => item.url === mapUrl);
  return result ? result.name : mapUrl;
}

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const [geoJson, isLoadingGeoJson] = useLoadGeoJson(options.mapUrl);
  const geoJsonFields = useMemo(() => getGeoJsonFields(geoJson), [geoJson]);
  const [customGeoJsonUrl, setCustomGeoJsonUrl] = useState(null);

  // While geoJson is loading - show last selected field in select
  const targetFields = isLoadingGeoJson ? filter([options.targetField], isString) : geoJsonFields;

  const handleMapUrlChange = useCallback(
    mapUrl => {
      if (!mapUrl) {
        setCustomGeoJsonUrl(null);
      }
      onOptionsChange({ mapUrl: mapUrl || null });
    },
    [onOptionsChange]
  );

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Map URL"
          className="w-100"
          data-test="Choropleth.Editor.MapUrl"
          showSearch
          showArrow
          filterOption={false}
          allowClear
          placeholder="Choose map or type GeoJSON URL..."
          value={options.mapUrl || undefined}
          onSearch={value => setCustomGeoJsonUrl(value !== "" ? value : null)}
          onChange={handleMapUrlChange}>
          {customGeoJsonUrl && <Select.Option key={customGeoJsonUrl}>{customGeoJsonUrl}</Select.Option>}
          {map(availableMaps, ({ url: mapUrl }, mapKey) => (
            <Select.Option key={mapUrl} data-test={`Choropleth.Editor.MapUrl.${mapKey}`}>
              {getMapLabel(mapUrl)}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Select
              label="Key column"
              className="w-100"
              data-test="Choropleth.Editor.KeyColumn"
              disabled={data.columns.length === 0}
              defaultValue={options.keyColumn}
              onChange={keyColumn => onOptionsChange({ keyColumn })}>
              {map(data.columns, ({ name }) => (
                <Select.Option key={name} data-test={`Choropleth.Editor.KeyColumn.${name}`}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Target Field"
              className="w-100"
              data-test="Choropleth.Editor.TargetField"
              disabled={isLoadingGeoJson || targetFields.length === 0}
              loading={isLoadingGeoJson}
              value={options.targetField}
              onChange={targetField => onOptionsChange({ targetField })}>
              {map(targetFields, field => (
                <Select.Option key={field} data-test={`Choropleth.Editor.TargetField.${field}`}>
                  {field}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Select
          label="Value column"
          className="w-100"
          data-test="Choropleth.Editor.ValueColumn"
          disabled={data.columns.length === 0}
          defaultValue={options.valueColumn}
          onChange={valueColumn => onOptionsChange({ valueColumn })}>
          {map(data.columns, ({ name }) => (
            <Select.Option key={name} data-test={`Choropleth.Editor.ValueColumn.${name}`}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
