import { isString, map, filter, get } from "lodash";
import React, { useMemo, useCallback } from "react";
import * as Grid from "antd/lib/grid";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { Section, Select } from "@/components/visualizations/editor";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import { getGeoJsonFields } from "./utils";

export default function GeneralSettings({
  options,
  data,
  onOptionsChange
}: any) {
  const [geoJson, isLoadingGeoJson] = useLoadGeoJson(options.mapType);
  const geoJsonFields = useMemo(() => getGeoJsonFields(geoJson), [geoJson]);

  // While geoJson is loading - show last selected field in select
  const targetFields = isLoadingGeoJson ? filter([options.targetField], isString) : geoJsonFields;

  const fieldNames = get(visualizationsSettings, `choroplethAvailableMaps.${options.mapType}.fieldNames`, {});

  const handleMapChange = useCallback(
    mapType => {
      onOptionsChange({ mapType: mapType || null });
    },
    [onOptionsChange]
  );

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Map"
          data-test="Choropleth.Editor.MapType"
          defaultValue={options.mapType}
          onChange={handleMapChange}>
          {map(visualizationsSettings.choroplethAvailableMaps, (_, mapType) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={mapType} data-test={`Choropleth.Editor.MapType.${mapType}`}>
              {get(visualizationsSettings, `choroplethAvailableMaps.${mapType}.name`, mapType)}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Select
              label="Key Column"
              className="w-100"
              data-test="Choropleth.Editor.KeyColumn"
              disabled={data.columns.length === 0}
              defaultValue={options.keyColumn}
              onChange={(keyColumn: any) => onOptionsChange({ keyColumn })}>
              {map(data.columns, ({ name }) => (
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
                <Select.Option key={name} data-test={`Choropleth.Editor.KeyColumn.${name}`}>
                  {name}
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
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
              onChange={(targetField: any) => onOptionsChange({ targetField })}>
              {map(targetFields, field => (
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
                <Select.Option key={field} data-test={`Choropleth.Editor.TargetField.${field}`}>
                  {fieldNames[field] || field}
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Value Column"
          data-test="Choropleth.Editor.ValueColumn"
          disabled={data.columns.length === 0}
          defaultValue={options.valueColumn}
          onChange={(valueColumn: any) => onOptionsChange({ valueColumn })}>
          {map(data.columns, ({ name }) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={name} data-test={`Choropleth.Editor.ValueColumn.${name}`}>
              {name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
