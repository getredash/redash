// This helper converts USA map from Mercator projection to Albers (USA)
// Usage: `node convert-projection.js > usa-albers.geo.json`

const { each, map, filter } = require("lodash");
const d3 = require("d3");

const albersUSA = d3.geo.albersUsa();
const mercator = d3.geo.mercator();

const geojson = require("./usa.geo.json");

function convertPoint(coord) {
  const pt = albersUSA(coord);
  return pt ? mercator.invert(pt) : null;
}

function convertLineString(points) {
  return filter(map(points, convertPoint));
}

function convertPolygon(polygon) {
  return map(polygon, convertLineString);
}

function convertMultiPolygon(multiPolygon) {
  return map(multiPolygon, convertPolygon);
}

each(geojson.features, feature => {
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
