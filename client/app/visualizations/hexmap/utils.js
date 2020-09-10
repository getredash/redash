import { extend } from 'lodash';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';


const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000],
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000],
});

export const lightingEffect = new LightingEffect({ ambientLight, pointLight1, pointLight2 });

export const material = {
  ambient: 0.64,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51],
};

export const minZoom = 2;
export const maxZoom = 17;

export const MAPBOX_TOKEN = ""; // eslint-disable-line

export const colorRange = [
  [255, 255, 178, 128],
  [254, 217, 118, 128],
  [254, 178, 76, 128],
  [253, 141, 60, 128],
  [240, 59, 32, 128],
  [189, 0, 38, 128],
];

export function setMidLatLon(data, options, onOptionsChange) {
  const lat = data.reduce(
    (a, b) => ({ [options.latColName]: a[options.latColName] + b[options.latColName] }),
    ({ [options.latColName]: 0 }),
  )[options.latColName] / data.length;
  const lon = data.reduce(
    (a, b) => ({ [options.lonColName]: a[options.lonColName] + b[options.lonColName] }),
    ({ [options.lonColName]: 0 }),
  )[options.lonColName] / data.length;

  if (onOptionsChange) {
    onOptionsChange(extend(options, { centerLat: lat, centerLon: lon, isCenterSet: true }));
  }
  return { centerLat: lat, centerLon: lon };
}
