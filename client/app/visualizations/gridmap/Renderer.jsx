import { extend } from 'lodash';
import { StaticMap } from 'react-map-gl';
import { ScreenGridLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import React, { useState } from 'react';
import { RendererPropTypes } from '@/visualizations';
import { lightingEffect, material, colorRange, MAPBOX_TOKEN, minZoom, maxZoom, setMidLatLon } from './utils';

import 'mapbox-gl/src/css/mapbox-gl.css';
import './render.less';

function _viewState(data, options) {
  if (options.setMapCenter) {
    const { centerLat, centerLon } = setMidLatLon(data, options);
    const { zoom, bearing, pitch } = options;
    return {
      longitude: centerLon,
      latitude: centerLat,
      zoom,
      minZoom,
      maxZoom,
      bearing,
      pitch,
    };
  }
  const { centerLat, centerLon, zoom, bearing, pitch } = options;
  return {
    longitude: centerLon,
    latitude: centerLat,
    zoom,
    minZoom,
    maxZoom,
    bearing,
    pitch,
  };
}

function _renderLayers(data, options, setTooltip) {
  const domain = options.setMaxDomain ? [0, options.maxCount] : null;

  return [
    new ScreenGridLayer({
      id: 'gridmap',
      colorRange,
      coverage: 1,
      data,
      cellSizePixels: options.cellSize,
      gpuAggregation: true,
      getPosition: d => [d[options.lonColName], d[options.latColName]],
      pickable: true,
      material,
      colorDomain: domain,
      onHover: ({ x, y, object }) => setTooltip({ x, y, count: object ? object.cellCount : 0 }),
    }),
  ];
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [tooltipData, setTooltip] = useState({});
  const mapStyle = 'mapbox://styles/mapbox/dark-v9';

  function updateOptions({ viewState }) {
    if (onOptionsChange) {
      if (options.setMapCenter) {
        const { zoom, bearing, pitch } = viewState;
        onOptionsChange(extend(options, {
          bearing,
          pitch,
          zoom,
        }));
      } else {
        const { latitude, longitude, zoom, bearing, pitch } = viewState;
        onOptionsChange(extend(options, {
          centerLat: latitude,
          centerLon: longitude,
          bearing,
          pitch,
          zoom,
        }));
      }
    }
  }

  return (
    <div className="gridmap-visualization-container">
      <DeckGL
        layers={_renderLayers(data.rows, options, setTooltip)}
        effects={[lightingEffect]}
        initialViewState={_viewState(data.rows, options)}
        controller
        onViewStateChange={updateOptions}
      >
        <StaticMap
          reuseMaps
          mapStyle={mapStyle}
          preventStyleDiffing
          mapboxApiAccessToken={MAPBOX_TOKEN}
        />

        {tooltipData.count ?
          (
            <div className="tooltip" style={{ top: tooltipData.y, left: tooltipData.x, opacity: 1 }}>
              <b>
                { options.tooltipLabel }: { tooltipData.count }
              </b>
            </div>
          ) : null
        }
      </DeckGL>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
