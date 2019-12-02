import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Select from 'antd/lib/select';
import InputNumber from 'antd/lib/input-number';
import * as Grid from 'antd/lib/grid';
import ColorPicker from '@/components/ColorPicker';
import { EditorPropTypes } from '@/visualizations';
import ColorPalette from '../ColorPalette';

export default function ColorsSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-clustering-mode">Clustering mode</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="choropleth-editor-clustering-mode"
            className="w-100"
            data-test="Choropleth.Editor.ClusteringMode"
            defaultValue={options.clusteringMode}
            onChange={clusteringMode => onOptionsChange({ clusteringMode })}
          >
            <Select.Option value="q" data-test="Choropleth.Editor.ClusteringMode.q">quantile</Select.Option>
            <Select.Option value="e" data-test="Choropleth.Editor.ClusteringMode.e">equidistant</Select.Option>
            <Select.Option value="k" data-test="Choropleth.Editor.ClusteringMode.k">k-means</Select.Option>
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-steps">Steps</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="choropleth-editor-color-steps"
            className="w-100"
            data-test="Choropleth.Editor.ColorSteps"
            min={3}
            max={11}
            defaultValue={options.steps}
            onChange={steps => onOptionsChangeDebounced({ steps })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-min">Min Color</label>
        </Grid.Col>
        <Grid.Col span={12} className="text-nowrap">
          <ColorPicker
            id="choropleth-editor-color-min"
            interactive
            presetColors={ColorPalette}
            placement="topRight"
            color={options.colors.min}
            triggerProps={{ 'data-test': 'Choropleth.Editor.Colors.Min' }}
            onChange={min => onOptionsChange({ colors: { min } })}
          />
          <ColorPicker.Label color={options.colors.min} presetColors={ColorPalette} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-max">Max Color</label>
        </Grid.Col>
        <Grid.Col span={12} className="text-nowrap">
          <ColorPicker
            id="choropleth-editor-color-max"
            interactive
            presetColors={ColorPalette}
            placement="topRight"
            color={options.colors.max}
            triggerProps={{ 'data-test': 'Choropleth.Editor.Colors.Max' }}
            onChange={max => onOptionsChange({ colors: { max } })}
          />
          <ColorPicker.Label color={options.colors.max} presetColors={ColorPalette} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-no-value">No value color</label>
        </Grid.Col>
        <Grid.Col span={12} className="text-nowrap">
          <ColorPicker
            id="choropleth-editor-color-no-value"
            interactive
            presetColors={ColorPalette}
            placement="topRight"
            color={options.colors.noValue}
            triggerProps={{ 'data-test': 'Choropleth.Editor.Colors.NoValue' }}
            onChange={noValue => onOptionsChange({ colors: { noValue } })}
          />
          <ColorPicker.Label color={options.colors.noValue} presetColors={ColorPalette} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-background">Background color</label>
        </Grid.Col>
        <Grid.Col span={12} className="text-nowrap">
          <ColorPicker
            id="choropleth-editor-color-background"
            interactive
            presetColors={ColorPalette}
            placement="topRight"
            color={options.colors.background}
            triggerProps={{ 'data-test': 'Choropleth.Editor.Colors.Background' }}
            onChange={background => onOptionsChange({ colors: { background } })}
          />
          <ColorPicker.Label color={options.colors.background} presetColors={ColorPalette} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-color-borders">Borders color</label>
        </Grid.Col>
        <Grid.Col span={12} className="text-nowrap">
          <ColorPicker
            id="choropleth-editor-color-borders"
            interactive
            presetColors={ColorPalette}
            placement="topRight"
            color={options.colors.borders}
            triggerProps={{ 'data-test': 'Choropleth.Editor.Colors.Borders' }}
            onChange={borders => onOptionsChange({ colors: { borders } })}
          />
          <ColorPicker.Label color={options.colors.borders} presetColors={ColorPalette} />
        </Grid.Col>
      </Grid.Row>
    </React.Fragment>
  );
}

ColorsSettings.propTypes = EditorPropTypes;
