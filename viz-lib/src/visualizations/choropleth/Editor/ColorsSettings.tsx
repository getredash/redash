import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Select, InputNumber, ColorPicker } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ColorPalette from "../ColorPalette";

export default function ColorsSettings({
  options,
  onOptionsChange
}: any) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          layout="horizontal"
          label="Clustering Mode"
          data-test="Choropleth.Editor.ClusteringMode"
          defaultValue={options.clusteringMode}
          onChange={(clusteringMode: any) => onOptionsChange({ clusteringMode })}>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="q" data-test="Choropleth.Editor.ClusteringMode.q">
            quantile
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="e" data-test="Choropleth.Editor.ClusteringMode.e">
            equidistant
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="k" data-test="Choropleth.Editor.ClusteringMode.k">
            k-means
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Steps"
          data-test="Choropleth.Editor.ColorSteps"
          min={3}
          max={11}
          defaultValue={options.steps}
          onChange={(steps: any) => onOptionsChangeDebounced({ steps })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Min Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.min}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Min" }}
          onChange={(min: any) => onOptionsChange({ colors: { min } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.min} presetColors={ColorPalette} />}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Max Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.max}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Max" }}
          onChange={(max: any) => onOptionsChange({ colors: { max } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.max} presetColors={ColorPalette} />}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="No Value Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.noValue}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.NoValue" }}
          onChange={(noValue: any) => onOptionsChange({ colors: { noValue } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.noValue} presetColors={ColorPalette} />}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Background Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.background}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Background" }}
          onChange={(background: any) => onOptionsChange({ colors: { background } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.background} presetColors={ColorPalette} />}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Borders Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.borders}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Borders" }}
          onChange={(borders: any) => onOptionsChange({ colors: { borders } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.borders} presetColors={ColorPalette} />}
        />
      </Section>
    </React.Fragment>
  );
}

ColorsSettings.propTypes = EditorPropTypes;
