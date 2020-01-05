import { map } from "lodash";
import React from "react";
import { Section, Select, ColorPicker } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";
import ColorPalette from "@/visualizations/ColorPalette";

const ColorSchemes = [
  "Blackbody",
  "Bluered",
  "Blues",
  "Earth",
  "Electric",
  "Greens",
  "Greys",
  "Hot",
  "Jet",
  "Picnic",
  "Portland",
  "Rainbow",
  "RdBu",
  "Reds",
  "Viridis",
  "YlGnBu",
  "YlOrRd",
  "Custom...",
];

export default function HeatmapColorsSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <Select
          label="Color Scheme"
          className="w-100"
          data-test="Chart.Colors.Heatmap.ColorScheme"
          placeholder="Choose Color Scheme..."
          allowClear
          value={options.colorScheme || undefined}
          onChange={value => onOptionsChange({ colorScheme: value || null })}>
          {map(ColorSchemes, scheme => (
            <Select.Option key={scheme} value={scheme} data-test={`Chart.Colors.Heatmap.ColorScheme.${scheme}`}>
              {scheme}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {options.colorScheme === "Custom..." && (
        <React.Fragment>
          <Section>
            <ColorPicker
              layout="horizontal"
              label="Min Color:"
              data-test="Chart.Colors.Heatmap.MinColor"
              interactive
              placement="topLeft"
              presetColors={ColorPalette}
              color={options.heatMinColor}
              onChange={heatMinColor => onOptionsChange({ heatMinColor })}
              addonAfter={<ColorPicker.Label color={options.heatMinColor} presetColors={ColorPalette} />}
            />
          </Section>
          <Section>
            <ColorPicker
              layout="horizontal"
              label="Max Color:"
              data-test="Chart.Colors.Heatmap.MaxColor"
              interactive
              placement="topRight"
              presetColors={ColorPalette}
              color={options.heatMaxColor}
              onChange={heatMaxColor => onOptionsChange({ heatMaxColor })}
              addonAfter={<ColorPicker.Label color={options.heatMaxColor} presetColors={ColorPalette} />}
            />
          </Section>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

HeatmapColorsSettings.propTypes = EditorPropTypes;
