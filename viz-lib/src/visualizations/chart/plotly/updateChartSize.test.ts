import updateChartSize from "./updateChartSize";

test("an unchanged container size preserves the height reserved for a horizontal legend", () => {
  const container = document.createElement("div");
  Object.defineProperties(container, {
    offsetWidth: { value: 500 },
    offsetHeight: { value: 400, configurable: true },
  });
  const legend = document.createElement("div");
  legend.className = "legend";
  legend.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
  container.appendChild(legend);
  const layout = { width: 500, height: 400 };
  const options = { legend: { enabled: true, placement: "below" } };

  const initialUpdate = updateChartSize(container, layout, options);
  expect(initialUpdate).toBeDefined();
  (initialUpdate?.[1] as () => unknown)();
  expect(layout.height).toBe(300);

  // The resize observer polls again after initialization. Plotly shares this layout object;
  // mutating it without a relayout makes the next unrelated update undo the legend sizing.
  expect(updateChartSize(container, layout, options)).toBeUndefined();
  expect(layout.height).toBe(300);

  Object.defineProperty(container, "offsetHeight", { value: 500 });
  const resizeUpdate = updateChartSize(container, layout, options);
  expect(resizeUpdate).toBeDefined();
  (resizeUpdate?.[1] as () => unknown)();
  expect(layout.height).toBe(400);
  expect(legend.style.transform).toBe("translate(0, 400px)");
});
