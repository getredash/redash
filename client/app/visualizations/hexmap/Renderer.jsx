import { extend } from 'lodash';
import { StaticMap } from 'react-map-gl';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import React, { useState, useRef } from 'react';
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
  const { elevation, lonColName, latColName, radius, setMaxDomain, maxCount, displayCol } = options;

  const onHovered = ({ x, y, object }) => setTooltip({
    x,
    y,
    count: object ? object.points.length : 0,
    displayNames: object ? [...new Set(object.points.map(o => o[displayCol]))].join(',') : '',
  });

  if (data[0] && latColName in data[0] && lonColName in data[0]) {
    const domain = setMaxDomain ? [0, maxCount] : null;

    return [
      new HexagonLayer({
        id: 'heatmap',
        colorRange,
        coverage: 1,
        data,
        elevationRange: [0, 3000],
        elevationScale: elevation,
        extruded: true,
        getPosition: d => [d[lonColName], d[latColName]],
        pickable: true,
        radius,
        upperPercentile: 100,
        material,
        elevationDomain: domain,
        colorDomain: domain,
        onHover: onHovered,
        transitions: {
          elevationScale: 3000,
        },
      }),
    ];
  }
  return null;
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [tooltipData, setTooltip] = useState({});
  const deckGLRef = useRef(null);
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
    <div className="hexmap-visualization-container">
      <DeckGL
        ref={deckGLRef}
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
              </b><br />
              { tooltipData.displayNames }
            </div>
          ) : null
        }
      </DeckGL>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
