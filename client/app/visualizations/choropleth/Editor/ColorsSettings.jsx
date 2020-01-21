import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Select, InputNumber, ColorPicker } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";
import ColorPalette from "../ColorPalette";

export default function ColorsSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Clustering mode"
          className="w-100"
          data-test="Choropleth.Editor.ClusteringMode"
          defaultValue={options.clusteringMode}
          onChange={clusteringMode => onOptionsChange({ clusteringMode })}>
          <Select.Option value="q" data-test="Choropleth.Editor.ClusteringMode.q">
            quantile
          </Select.Option>
          <Select.Option value="e" data-test="Choropleth.Editor.ClusteringMode.e">
            equidistant
          </Select.Option>
          <Select.Option value="k" data-test="Choropleth.Editor.ClusteringMode.k">
            k-means
          </Select.Option>
        </Select>
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Steps"
          className="w-100"
          data-test="Choropleth.Editor.ColorSteps"
          min={3}
          max={11}
          defaultValue={options.steps}
          onChange={steps => onOptionsChangeDebounced({ steps })}
        />
      </Section>

      <Section>
        <ColorPicker
          layout="horizontal"
          label="Min Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.min}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Min" }}
          onChange={min => onOptionsChange({ colors: { min } })}
          addonAfter={<ColorPicker.Label color={options.colors.min} presetColors={ColorPalette} />}
        />
      </Section>

      <Section>
        <ColorPicker
          layout="horizontal"
          label="Max Color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.max}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Max" }}
          onChange={max => onOptionsChange({ colors: { max } })}
          addonAfter={<ColorPicker.Label color={options.colors.max} presetColors={ColorPalette} />}
        />
      </Section>

      <Section>
        <ColorPicker
          layout="horizontal"
          label="No value color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.noValue}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.NoValue" }}
          onChange={noValue => onOptionsChange({ colors: { noValue } })}
          addonAfter={<ColorPicker.Label color={options.colors.noValue} presetColors={ColorPalette} />}
        />
      </Section>

      <Section>
        <ColorPicker
          layout="horizontal"
          label="Background color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.background}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Background" }}
          onChange={background => onOptionsChange({ colors: { background } })}
          addonAfter={<ColorPicker.Label color={options.colors.background} presetColors={ColorPalette} />}
        />
      </Section>

      <Section>
        <ColorPicker
          layout="horizontal"
          label="Borders color"
          interactive
          presetColors={ColorPalette}
          placement="topRight"
          color={options.colors.borders}
          triggerProps={{ "data-test": "Choropleth.Editor.Colors.Borders" }}
          onChange={borders => onOptionsChange({ colors: { borders } })}
          addonAfter={<ColorPicker.Label color={options.colors.borders} presetColors={ColorPalette} />}
        />
      </Section>
    </React.Fragment>
  );
}

ColorsSettings.propTypes = EditorPropTypes;
