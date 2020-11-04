export default function prepareGroupedLayout(plotlyLayout, seriesList) {
  // console.log(plotlyLayout);
  delete plotlyLayout.barmode;
  delete plotlyLayout.xaxis;
  plotlyLayout.margin.b = 45;

  const categories = _.uniq(_.flatten(seriesList.map(series => series.data.map(item => item.x))));
  // console.log(plotlyData);
  const layout = {
    barmode: "stack",
    ...plotlyLayout,
  };
  const step = parseFloat((1 / categories.length).toFixed(2));
  // console.log(step);
  for (let i = 0; i < categories.length; i++) {
    const key = `xaxis${i > 0 ? i + 1 : ""}`;
    layout[key] = {
      domain: [i * step, i * step + step],
      anchor: `x${i > 0 ? i + 1 : ""}`,
      title: categories[i],
      color: "#ffffffbf",
      zerolinecolor: "rgba(255, 255, 255, 0.12)",
    };
  }

  // console.log(layout);
  return layout;
}
