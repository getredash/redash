import { isArray, map, mapValues, includes, some, each, difference, toNumber } from "lodash";
import React, { useMemo } from "react";
import { Section, Select, Checkbox, InputNumber } from "@/components/visualizations/editor";
import { UpdateOptionsStrategy } from "@/components/visualizations/editor/createTabbedEditor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import ChartTypeSelect from "./ChartTypeSelect";
import ColumnMappingSelect from "./ColumnMappingSelect";

function getAvailableColumnMappingTypes(options) {
  const result = ["x", "y"];

  if (!includes(["custom", "heatmap"], options.globalSeriesType)) {
    result.push("series");
  }

  if (options.globalSeriesType === "bubble" || some(options.seriesOptions, { type: "bubble" })) {
    result.push("size");
  }

  if (options.globalSeriesType === "heatmap") {
    result.push("zVal");
  }

  if (!includes(["custom", "bubble", "heatmap"], options.globalSeriesType)) {
    result.push("yError");
  }

  return result;
}

function getMappedColumns(options, availableColumns) {
  const mappedColumns = {};
  const availableTypes = getAvailableColumnMappingTypes(options);
  each(availableTypes, type => {
    mappedColumns[type] = ColumnMappingSelect.MappingTypes[type].multiple ? [] : null;
  });

  availableColumns = map(availableColumns, c => c.name);
  const usedColumns = [];

  each(options.columnMapping, (type, column) => {
    if (includes(availableColumns, column) && includes(availableTypes, type)) {
      const { multiple } = ColumnMappingSelect.MappingTypes[type];
      if (multiple) {
        mappedColumns[type].push(column);
      } else {
        mappedColumns[type] = column;
      }
      usedColumns.push(column);
    }
  });

  return {
    mappedColumns,
    unusedColumns: difference(availableColumns, usedColumns),
  };
}

function mappedColumnsToColumnMappings(mappedColumns) {
  const result = {};
  each(mappedColumns, (value, type) => {
    if (isArray(value)) {
      each(value, v => {
        result[v] = type;
      });
    } else {
      if (value) {
        result[value] = type;
      }
    }
  });
  return result;
}

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const { mappedColumns, unusedColumns } = useMemo(() => getMappedColumns(options, data.columns), [
    options,
    data.columns,
  ]);

  function handleGlobalSeriesTypeChange(globalSeriesType) {
    onOptionsChange({
      globalSeriesType,
      showDataLabels: globalSeriesType === "pie",
      invertedAxes: false,
      seriesOptions: mapValues(options.seriesOptions, series => ({
        ...series,
        type: globalSeriesType,
      })),
    });
  }

  function handleColumnMappingChange(column, type) {
    const columnMapping = mappedColumnsToColumnMappings({
      ...mappedColumns,
      [type]: column,
    });
    onOptionsChange({ columnMapping }, UpdateOptionsStrategy.shallowMerge);
  }

  function handleLegendPlacementChange(value) {
    if (value === "hidden") {
      onOptionsChange({ legend: { enabled: false } });
    } else {
      onOptionsChange({ legend: { enabled: true, placement: value } });
    }
  }

  function handleAxesInversion() {
    // moves any item in the right Y axis to the left one
    const seriesOptions = mapValues(options.seriesOptions, series => ({
      ...series,
      yAxis: 0,
    }));
    onOptionsChange({ invertedAxes: !options.invertedAxes, seriesOptions });
  }

  return (
    <React.Fragment>
      <Section>
        <ChartTypeSelect
          label="Chart Type"
          data-test="Chart.GlobalSeriesType"
          defaultValue={options.globalSeriesType}
          onChange={handleGlobalSeriesTypeChange}
        />
      </Section>

      {includes(["column", "line"], options.globalSeriesType) && (
        <Section>
          <Checkbox
            data-test="Chart.InvertedAxes"
            defaultChecked={options.invertedAxes}
            checked={options.invertedAxes}
            onChange={handleAxesInversion}>
            Horizontal Chart
          </Checkbox>
        </Section>
      )}

      {map(mappedColumns, (value, type) => (
        <ColumnMappingSelect
          key={type}
          type={type}
          value={value}
          isAxesInverted={options.invertedAxes}
          availableColumns={unusedColumns}
          onChange={handleColumnMappingChange}
        />
      ))}

      {includes(["bubble"], options.globalSeriesType) && (
        <React.Fragment>
          <Section>
            <InputNumber
              label="Bubble Size Coefficient"
              data-test="Chart.BubbleCoefficient"
              defaultValue={options.coefficient}
              onChange={value => onOptionsChange({ coefficient: toNumber(value) })}
            />
          </Section>

          <Section>
            <Select
              label="Bubble Size Proportional To"
              data-test="Chart.SizeMode"
              defaultValue={options.sizemode}
              onChange={mode => onOptionsChange({ sizemode: mode })}>
              <Select.Option value="area" data-test="Chart.SizeMode.Area">
                Area
              </Select.Option>
              <Select.Option value="diameter" data-test="Chart.SizeMode.Diameter">
                Diameter
              </Select.Option>
            </Select>
          </Section>
        </React.Fragment>
      )}

      {includes(["pie"], options.globalSeriesType) && (
        <Section>
          <Select
            label="Direction"
            data-test="Chart.PieDirection"
            defaultValue={options.direction.type}
            onChange={type => onOptionsChange({ direction: { type } })}>
            <Select.Option value="counterclockwise" data-test="Chart.PieDirection.Counterclockwise">
              Counterclockwise
            </Select.Option>
            <Select.Option value="clockwise" data-test="Chart.PieDirection.Clockwise">
              Clockwise
            </Select.Option>
          </Select>
        </Section>
      )}

      {!includes(["custom", "heatmap"], options.globalSeriesType) && (
        <React.Fragment>
          <Section>
            <Select
              label="Legend Placement"
              data-test="Chart.LegendPlacement"
              value={options.legend.enabled ? options.legend.placement : "hidden"}
              onChange={handleLegendPlacementChange}>
              <Select.Option value="hidden" data-test="Chart.LegendPlacement.HideLegend">
                Hide legend
              </Select.Option>
              <Select.Option value="auto" data-test="Chart.LegendPlacement.Auto">
                Right
              </Select.Option>
              <Select.Option value="below" data-test="Chart.LegendPlacement.Below">
                Bottom
              </Select.Option>
            </Select>
          </Section>

          {options.legend.enabled && (
            <Section>
              <Select
                label="Legend Items Order"
                data-test="Chart.LegendItemsOrder"
                value={options.legend.traceorder}
                onChange={traceorder => onOptionsChange({ legend: { traceorder } })}>
                <Select.Option value="normal" data-test="Chart.LegendItemsOrder.Normal">
                  Normal
                </Select.Option>
                <Select.Option value="reversed" data-test="Chart.LegendItemsOrder.Reversed">
                  Reversed
                </Select.Option>
              </Select>
            </Section>
          )}
        </React.Fragment>
      )}

      {includes(["box"], options.globalSeriesType) && (
        <Section>
          <Checkbox
            data-test="Chart.ShowPoints"
            defaultChecked={options.showpoints}
            onChange={event => onOptionsChange({ showpoints: event.target.checked })}>
            Show All Points
          </Checkbox>
        </Section>
      )}

      {!includes(["custom", "heatmap"], options.globalSeriesType) && (
        <Section>
          <Select
            label="Stacking"
            data-test="Chart.Stacking"
            defaultValue={options.series.stacking}
            disabled={!includes(["line", "area", "column"], options.globalSeriesType)}
            onChange={stacking => onOptionsChange({ series: { stacking } })}>
            <Select.Option value={null} data-test="Chart.Stacking.Disabled">
              Disabled
            </Select.Option>
            <Select.Option value="stack" data-test="Chart.Stacking.Stack">
              Stack
            </Select.Option>
          </Select>
        </Section>
      )}

      {includes(["line", "area", "column"], options.globalSeriesType) && (
        <Section>
          <Checkbox
            data-test="Chart.NormalizeValues"
            defaultChecked={options.series.percentValues}
            onChange={event => onOptionsChange({ series: { percentValues: event.target.checked } })}>
            Normalize values to percentage
          </Checkbox>
        </Section>
      )}

      {!includes(["custom", "heatmap", "bubble", "scatter"], options.globalSeriesType) && (
        <Section>
          <Select
            label="Missing and NULL values"
            data-test="Chart.MissingValues"
            defaultValue={options.missingValuesAsZero ? 1 : 0}
            onChange={value => onOptionsChange({ missingValuesAsZero: !!value })}>
            <Select.Option value={0} data-test="Chart.MissingValues.Keep">
              Do not display in chart
            </Select.Option>
            <Select.Option value={1} data-test="Chart.MissingValues.Zero">
              Convert to 0 and display in chart
            </Select.Option>
          </Select>
        </Section>
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
