import { isString, map, filter } from "lodash";
import React, { useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { Section, Select, Input } from "@/components/visualizations/editor";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import availableMaps, { getMapUrl } from "../maps";
import { getGeoJsonFields } from "./utils";

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const [geoJson, isLoadingGeoJson] = useLoadGeoJson(getMapUrl(options.mapType, options.customMapUrl));
  const geoJsonFields = useMemo(() => getGeoJsonFields(geoJson), [geoJson]);

  // While geoJson is loading - show last selected field in select
  const targetFields = isLoadingGeoJson ? filter([options.targetField], isString) : geoJsonFields;

  const [handleCustomMapUrlChange] = useDebouncedCallback(customMapUrl => {
    onOptionsChange({ customMapUrl });
  }, 200);

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Map type"
          className="w-100"
          data-test="Choropleth.Editor.MapType"
          defaultValue={options.mapType}
          onChange={mapType => onOptionsChange({ mapType })}>
          {map(availableMaps, ({ name }, mapKey) => (
            <Select.Option key={mapKey} data-test={`Choropleth.Editor.MapType.${mapKey}`}>
              {name}
            </Select.Option>
          ))}
          <Select.Option key="custom" data-test="Choropleth.Editor.MapType.custom">
            Custom...
          </Select.Option>
        </Select>
      </Section>

      {options.mapType === "custom" && (
        <Section>
          <Input
            data-test="Choropleth.Editor.CustomMapUrl"
            placeholder="Custom map URL..."
            defaultValue={options.customMapUrl}
            onChange={event => handleCustomMapUrlChange(event.target.value)}
          />
        </Section>
      )}

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
              label="Target field"
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
