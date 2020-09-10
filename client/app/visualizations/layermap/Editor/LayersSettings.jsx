import { groupBy, keys, sortBy } from 'lodash';
import React from 'react';
import { Table, InputNumber } from 'antd';
import { EditorPropTypes } from '@/visualizations';

export default function LayersSettings({ options, data, onOptionsChange }) {
  if (options.layers.length === 0) {
    const layersData = keys(groupBy(data.rows, options.groupByCol)).map(d => ({
      key: d,
      layername: d,
      radius: 100000,
      elevation: 8,
    }));
    onOptionsChange({ layers: layersData, selectedLayer: layersData[0].key });
  }

  const columns = [
    {
      title: 'Layer',
      dataIndex: 'layername',
    },
    {
      title: 'Radius',
      dataIndex: 'radius',
      render: (unused, item) => (
        <InputNumber
          className="w-70"
          size="small"
          data-test="Layermap.Layers.Radius"
          defaultValue={options.layers.filter(d => d.key === item.key)[0].radius}
          onChange={(radius) => {
            const originalLayers = options.layers.filter(d => d.key !== item.key);
            const changedLayer = options.layers.filter(d => d.key === item.key)[0];
            changedLayer.radius = radius;
            originalLayers.push(changedLayer);
            onOptionsChange({ layers: sortBy(originalLayers, 'key') });
          }}
        />
      ),
    },
    {
      title: 'Elevation',
      dataIndex: 'elevation',
      render: (unused, item) => (
        <InputNumber
          className="w-70"
          size="small"
          data-test="Layermap.Layers.Elevation"
          defaultValue={options.layers.filter(d => d.key === item.key)[0].elevation}
          onChange={(elevation) => {
            const originalLayers = options.layers.filter(d => d.key !== item.key);
            const changedLayer = options.layers.filter(d => d.key === item.key)[0];
            changedLayer.elevation = elevation;
            originalLayers.push(changedLayer);
            onOptionsChange({ layers: sortBy(originalLayers, 'key') });
          }}
        />
      ),
    },
  ];
  const dataRows = options.layers;

  return (
    <div>
      <Table
        rowSelection={{
          type: 'radio',
          selectedRowKeys: options.selectedLayer,
          onChange: (selectedRowKeys) => {
            onOptionsChange({ selectedLayer: selectedRowKeys[0] });
          },
        }}
        columns={columns}
        dataSource={dataRows}
        pagination={{ hideOnSinglePage: true }}
      />
    </div>
  );
}

LayersSettings.propTypes = EditorPropTypes;
