import { map } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import * as Grid from 'antd/lib/grid';
import ColorPicker from '@/components/ColorPicker';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';

const ColorSchemes = [
  'Blackbody', 'Bluered', 'Blues', 'Earth', 'Electric',
  'Greens', 'Greys', 'Hot', 'Jet', 'Picnic', 'Portland',
  'Rainbow', 'RdBu', 'Reds', 'Viridis', 'YlGnBu', 'YlOrRd',
  'Custom...',
];

export default function HeatmapColorsSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <label htmlFor="chart-editor-colors-heatmap-scheme">Color Scheme</label>
        <Select
          id="chart-editor-colors-heatmap-scheme"
          className="w-100"
          data-test="Chart.Colors.Heatmap.ColorScheme"
          placeholder="Choose Color Scheme..."
          allowClear
          value={options.colorScheme || undefined}
          onChange={value => onOptionsChange({ colorScheme: value || null })}
        >
          {map(ColorSchemes, scheme => (
            <Select.Option key={scheme} value={scheme} data-test={`Chart.Colors.Heatmap.ColorScheme.${scheme}`}>
              {scheme}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {(options.colorScheme === 'Custom...') && (
        <Section>
          <Grid.Row type="flex" align="middle">
            <Grid.Col span={12}>
              <label className="m-r-10" htmlFor="chart-editor-colors-heatmap-min-color">Min Color:</label>
              <ColorPicker
                data-test="Chart.Colors.Heatmap.MinColor"
                id="chart-editor-colors-heatmap-min-color"
                interactive
                placement="topLeft"
                presetColors={ColorPalette}
                color={options.heatMinColor}
                onChange={heatMinColor => onOptionsChange({ heatMinColor })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <label className="m-r-10" htmlFor="chart-editor-colors-heatmap-max-color">Max Color:</label>
              <ColorPicker
                data-test="Chart.Colors.Heatmap.MaxColor"
                id="chart-editor-colors-heatmap-max-color"
                interactive
                placement="topRight"
                presetColors={ColorPalette}
                color={options.heatMaxColor}
                onChange={heatMaxColor => onOptionsChange({ heatMaxColor })}
              />
            </Grid.Col>
          </Grid.Row>
        </Section>
      )}
    </React.Fragment>
  );
}

HeatmapColorsSettings.propTypes = EditorPropTypes;
