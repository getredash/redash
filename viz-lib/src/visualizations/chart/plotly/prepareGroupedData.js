import { uniq, flatten } from "lodash";
import md5 from "md5";

function stringToColour(str) {
  let hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
}
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

export default function prepareGroupedData(seriesList, options) {
  // console.log(options);

  const { columnMapping } = options;
  const groupBy = getKeyByValue(columnMapping, "series");
  const splitBy = getKeyByValue(columnMapping, "group");
  const x = getKeyByValue(columnMapping, "x");
  const y = getKeyByValue(columnMapping, "y");

  // console.log(groupBy, splitBy);

  const categories = uniq(flatten(seriesList.map(series => series.data.map(item => item.x))));
  // console.log(categories);
  const plotlyData = [];
  for (let i = 0; i < seriesList.length; i++) {
    for (let j = 0; j < seriesList[i].data.length; j++) {
      const item = seriesList[i].data[j].$raw;
      const plotlyItem = {
        x: [item[splitBy]],
        y: [item[y]],
        type: "bar",
        name: item[groupBy],
        xaxis: `x${categories.indexOf(item[x]) + 1}`,
        barmode: "stack",
        marker: { color: stringToColour(md5(item[groupBy])) },
      };

      plotlyData.push(plotlyItem);
    }
  }

  return plotlyData;
}
