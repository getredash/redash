import d3 from "d3";
import { isNil, extend, map, filter, groupBy, omit } from "lodash";

export default function prepareData(data, options) {
  const colorScale = d3.scale.category10();

  const { classify, latColName, lonColName } = options;

  const pointGroups = classify ? groupBy(data.rows, classify) : { All: data.rows };

  return filter(
    map(pointGroups, (rows, name) => {
      const points = filter(
        map(rows, row => {
          const lat = row[latColName];
          const lon = row[lonColName];
          if (isNil(lat) || isNil(lon)) {
            return null;
          }
          return { lat, lon, row: omit(row, [latColName, lonColName]) };
        })
      );
      if (points.length === 0) {
        return null;
      }

      const result = extend({}, options.groups[name], { name, points });
      if (isNil(result.color)) {
        result.color = colorScale(name);
      }

      return result;
    })
  );
}
