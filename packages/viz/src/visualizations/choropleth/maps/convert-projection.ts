// This helper converts USA map from Mercator projection to Albers (USA)
// Usage: `node convert-projection.js > usa-albers.geo.json`

const { each, map, filter } = require("lodash");
// @ts-expect-error ts-migrate(2403) FIXME: Subsequent variable declarations must have the sam... Remove this comment to see the full error message
const d3 = require("d3");

// @ts-expect-error ts-migrate(2339) FIXME: Property 'geo' does not exist on type 'typeof impo... Remove this comment to see the full error message
const albersUSA = d3.geo.albersUsa();
// @ts-expect-error ts-migrate(2339) FIXME: Property 'geo' does not exist on type 'typeof impo... Remove this comment to see the full error message
const mercator = d3.geo.mercator();

const geojson = require("./usa.geo.json");

function convertPoint(coord: any) {
  const pt = albersUSA(coord);
  return pt ? mercator.invert(pt) : null;
}

function convertLineString(points: any) {
  return filter(map(points, convertPoint));
}

function convertPolygon(polygon: any) {
  return map(polygon, convertLineString);
}

function convertMultiPolygon(multiPolygon: any) {
  return map(multiPolygon, convertPolygon);
}

each(geojson.features, (feature: any) => {
  switch (feature.geometry.type) {
    case "Polygon":
      feature.geometry.coordinates = convertPolygon(feature.geometry.coordinates);
      break;
    case "MultiPolygon":
      feature.geometry.coordinates = convertMultiPolygon(feature.geometry.coordinates);
      break;
  }
});

console.log(JSON.stringify(geojson));
