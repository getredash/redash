import { isEqual, omit, merge } from 'lodash';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';
import { $http } from '@/services/ng';

import initChoropleth from './initChoropleth';
import { prepareData } from './utils';
import './renderer.less';

import countriesDataUrl from './maps/countries.geo.json';
import subdivJapanDataUrl from './maps/japan.prefectures.geo.json';

function getDataUrl(type) {
  switch (type) {
    case 'countries': return countriesDataUrl;
    case 'subdiv_japan': return subdivJapanDataUrl;
    default: return null;
  }
}

const geoJsonCache = {};

function useGeoJson(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!geoJsonCache[url]) {
      geoJsonCache[url] = {
        url,
        promise: $http.get(url).then(response => response.data),
        refcount: 0,
      };
    }
    const item = geoJsonCache[url];
    item.refcount += 1;
    let cancelled = false;
    item.promise.then((result) => {
      if (!cancelled) {
        setData(result);
      }
    });

    return () => {
      cancelled = true;
      item.refcount -= 1;
      if (item.refcount <= 0) {
        geoJsonCache[item.url] = undefined;
      }
    };
  }, [url]);

  return data;
}

function useMemoWithDeepCompare(create, inputs) {
  const valueRef = useRef();
  const value = useMemo(create, inputs);
  if (!isEqual(value, valueRef.current)) {
    valueRef.current = value;
  }
  return valueRef.current;
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);

  const geoJson = useGeoJson(getDataUrl(options.mapType));

  const optionsWithoutBounds = useMemoWithDeepCompare(
    () => omit(options, ['bounds']),
    [options],
  );

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (container) {
      const _map = initChoropleth(container);
      setMap(_map);
      return () => { _map.destroy(); };
    }
  }, [container]);

  useEffect(() => {
    if (map) {
      map.updateLayers(
        geoJson,
        prepareData(data.rows, optionsWithoutBounds.countryCodeColumn, optionsWithoutBounds.valueColumn),
        optionsWithoutBounds,
      );
    }
  }, [map, geoJson, data, optionsWithoutBounds]);

  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, options.bounds]);

  useEffect(() => {
    if (map && onOptionsChange) {
      map.onBoundsChange = (bounds) => {
        onOptionsChange(merge({}, options, { bounds }));
      };
    }
  }, [map, options, onOptionsChange]);

  return (
    <div
      className="map-visualization-container"
      style={{ background: options.colors.background }}
      ref={setContainer}
    />
  );
}

Renderer.propTypes = RendererPropTypes;
