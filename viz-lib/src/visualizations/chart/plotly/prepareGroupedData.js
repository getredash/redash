import _ from "lodash";

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

export default function prepareGroupedData(seriesList, options) {
  // console.log(seriesList, options);
  const categories = _.uniq(_.flatten(seriesList.map(series => series.data.map(item => item.x))));
  // console.log(categories);
  const plotlyData = [];
  for (let i = 0; i < seriesList.length; i++) {
    for (let j = 0; j < seriesList[i].data.length; j++) {
      const item = seriesList[i].data[j].$raw;
      const plotlyItem = {
        x: [item.type],
        y: [item.value],
        type: "bar",
        name: item.name,
        xaxis: `x${categories.indexOf(item.office) + 1}`,
        barmode: "stack",
        marker: { color: stringToColour(item.name) },
      };
      // console.log(categories.indexOf(item.office) + 1);
      plotlyData.push(plotlyItem);
    }
  }

  return plotlyData;
}
