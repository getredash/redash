import { isArray, map, mapValues, includes, some, each, difference, toNumber } from "lodash";
import React, { useMemo } from "react";
import { Section, Select, Checkbox, InputNumber, ContextHelp, Input } from "@/components/visualizations/editor";
import { UpdateOptionsStrategy } from "@/components/visualizations/editor/createTabbedEditor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { AllColorPalettes } from "@/visualizations/ColorPalette";
import ChartTypeSelect from "./ChartTypeSelect";
import ColumnMappingSelect from "./ColumnMappingSelect";
import { useDebouncedCallback } from "use-debounce/lib";

function getAvailableColumnMappingTypes(options: any) {
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

function getMappedColumns(options: any, availableColumns: any) {
  const mappedColumns = {};
  const availableTypes = getAvailableColumnMappingTypes(options);
  each(availableTypes, type => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    mappedColumns[type] = ColumnMappingSelect.MappingTypes[type].multiple ? [] : null;
  });

  availableColumns = map(availableColumns, c => c.name);
  const usedColumns: any = [];

  each(options.columnMapping, (type, column) => {
    if (includes(availableColumns, column) && includes(availableTypes, type)) {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const { multiple } = ColumnMappingSelect.MappingTypes[type];
      if (multiple) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        mappedColumns[type].push(column);
      } else {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

function mappedColumnsToColumnMappings(mappedColumns: any) {
  const result = {};
  each(mappedColumns, (value, type) => {
    if (isArray(value)) {
      each(value, v => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        result[v] = type;
      });
    } else {
      if (value) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        result[value] = type;
      }
    }
  });
  return result;
}

export default function GeneralSettings({ options, data, onOptionsChange }: any) {
  const { mappedColumns, unusedColumns } = useMemo(() => getMappedColumns(options, data.columns), [
    options,
    data.columns,
  ]);

  function handleGlobalSeriesTypeChange(globalSeriesType: any) {
    onOptionsChange({
      globalSeriesType,
      showDataLabels: globalSeriesType === "pie",
      swappedAxes: false,
      seriesOptions: mapValues(options.seriesOptions, series => ({
        ...series,
        type: globalSeriesType,
      })),
    });
  }

  function handleColumnMappingChange(column: any, type: any) {
    const columnMapping = mappedColumnsToColumnMappings({
      ...mappedColumns,
      [type]: column,
    });
    onOptionsChange({ columnMapping }, UpdateOptionsStrategy.shallowMerge);
  }

  function handleLegendPlacementChange(value: any) {
    if (value === "hidden") {
      onOptionsChange({ legend: { enabled: false } });
    } else {
      onOptionsChange({ legend: { enabled: true, placement: value } });
    }
  }

  function handleAxesSwapping() {
    // moves any item in the right Y axis to the left one
    const seriesOptions = mapValues(options.seriesOptions, series => ({
      ...series,
      yAxis: 0,
    }));
    onOptionsChange({ swappedAxes: !options.swappedAxes, seriesOptions });
  }

  const [debouncedOnOptionsChange] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ChartTypeSelect
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ label: string; "data-test": string; defaul... Remove this comment to see the full error message
          label="Chart Type"
          data-test="Chart.GlobalSeriesType"
          defaultValue={options.globalSeriesType}
          onChange={handleGlobalSeriesTypeChange}
        />
      </Section>

      {includes(["column", "line", "box"], options.globalSeriesType) && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <Section>
          <Checkbox
            data-test="Chart.SwappedAxes"
            defaultChecked={options.swappedAxes}
            checked={options.swappedAxes}
            onChange={handleAxesSwapping}>
            Horizontal Chart
          </Checkbox>
        </Section>
      )}

      {map(mappedColumns, (value, type) => (
        <ColumnMappingSelect
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key={type}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          type={type}
          value={value}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          areAxesSwapped={options.swappedAxes}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'unknown[]' is not assignable to type 'never'... Remove this comment to see the full error message
          availableColumns={unusedColumns}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(column: any, type: any) => void' is not ass... Remove this comment to see the full error message
          onChange={handleColumnMappingChange}
        />
      ))}

      {includes(["bubble"], options.globalSeriesType) && (
        <React.Fragment>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <InputNumber
              label="Bubble Size Coefficient"
              data-test="Chart.BubbleCoefficient"
              defaultValue={options.coefficient}
              onChange={(value: any) => onOptionsChange({ coefficient: toNumber(value) })}
            />
          </Section>

          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <Select
              label="Bubble Size Proportional To"
              data-test="Chart.SizeMode"
              defaultValue={options.sizemode}
              onChange={(mode: any) => onOptionsChange({ sizemode: mode })}>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="area" data-test="Chart.SizeMode.Area">
                Area
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="diameter" data-test="Chart.SizeMode.Diameter">
                Diameter
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
            </Select>
          </Section>
        </React.Fragment>
      )}

      {includes(["pie"], options.globalSeriesType) && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <Section>
          <Select
            label="Direction"
            data-test="Chart.PieDirection"
            defaultValue={options.direction.type}
            onChange={(type: any) => onOptionsChange({ direction: { type } })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value="counterclockwise" data-test="Chart.PieDirection.Counterclockwise">
              Counterclockwise
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value="clockwise" data-test="Chart.PieDirection.Clockwise">
              Clockwise
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          </Select>
          <Select
            label="Sort"
            defaultValue={options.piesort}
            onChange={(val: any) => onOptionsChange({ piesort: val })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value={true}>
              True
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value={false}>
              False
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          </Select>
        </Section>
      )}

      {!includes(["custom", "heatmap"], options.globalSeriesType) && (
        <React.Fragment>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <Select
              label="Legend Placement"
              data-test="Chart.LegendPlacement"
              value={options.legend.enabled ? options.legend.placement : "hidden"}
              onChange={handleLegendPlacementChange}>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="hidden" data-test="Chart.LegendPlacement.HideLegend">
                Hide legend
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="auto" data-test="Chart.LegendPlacement.Auto">
                Right
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="below" data-test="Chart.LegendPlacement.Below">
                Bottom
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
            </Select>
          </Section>

          {options.legend.enabled && (
            // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
            <Section>
              <Select
                label="Legend Items Order"
                data-test="Chart.LegendItemsOrder"
                value={options.legend.traceorder}
                onChange={(traceorder: any) => onOptionsChange({ legend: { traceorder } })}>
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
                <Select.Option value="normal" data-test="Chart.LegendItemsOrder.Normal">
                  Normal
                  {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
                </Select.Option>
                {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
                <Select.Option value="reversed" data-test="Chart.LegendItemsOrder.Reversed">
                  Reversed
                  {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
                </Select.Option>
              </Select>
            </Section>
          )}
        </React.Fragment>
      )}

      {includes(["box"], options.globalSeriesType) && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <Section>
          <Select
            label="Stacking"
            data-test="Chart.Stacking"
            defaultValue={options.series.stacking}
            disabled={!includes(["line", "area", "column"], options.globalSeriesType)}
            onChange={(stacking: any) => onOptionsChange({ series: { stacking } })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value={null} data-test="Chart.Stacking.Disabled">
              Disabled
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value="stack" data-test="Chart.Stacking.Stack">
              Stack
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          </Select>
        </Section>
      )}

      {includes(["line", "area", "column"], options.globalSeriesType) && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <Section>
          <Select
            label="Missing and NULL values"
            data-test="Chart.MissingValues"
            defaultValue={options.missingValuesAsZero ? 1 : 0}
            onChange={(value: any) => onOptionsChange({ missingValuesAsZero: !!value })}>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value={0} data-test="Chart.MissingValues.Keep">
              Do not display in chart
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            <Select.Option value={1} data-test="Chart.MissingValues.Zero">
              Convert to 0 and display in chart
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          </Select>
        </Section>
      )}

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Chart.EnableClickEvents"
          defaultChecked={options.enableLink}
          onChange={event => onOptionsChange({ enableLink: event.target.checked })}>
          Enable click events
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Chart.EnableClickEvents.NewTab"
          defaultChecked={options.linkOpenNewTab}
          onChange={event => onOptionsChange({ linkOpenNewTab: event.target.checked })}
          disabled={!(options.enableLink === true)}
        >
          Open in new tab
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={
            <React.Fragment>
              URL template
              {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
              <ContextHelp
                placement="topLeft"
                arrowPointAtCenter
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message
                icon={ContextHelp.defaultIcon}>
                <div>
                  Every curve can be referenced using <code>{"{{ @@x1 }} {{ @@y1 }} {{ @@x2 }} {{ @@y2 }} ..."}</code> syntax:<br/>
                  axis with any curve number according to the Series config.
                </div>
                <div>
                  The first met curve X and Y values can be referenced by just<code>{"{{ @@x }} {{ @@y }}"}</code> syntax.
                </div>
                <div>
                  Any unresolved reference would be replaced with an empty string.
                </div>
              </ContextHelp>
            </React.Fragment>
          }
          data-test="Chart.DataLabels.TextFormat"
          placeholder="(nothing)"
          defaultValue={options.linkFormat}
          onChange={(e: any) => debouncedOnOptionsChange({ linkFormat: e.target.value })}
          disabled={!(options.enableLink === true)}
        />
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
