import applyLayoutTheme from "./applyLayoutTheme";

describe("Visualizations -> Chart -> Plotly -> applyLayoutTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
  });

  test("leaves the layout alone in the light theme", () => {
    const layout = { xaxis: { title: "x" }, yaxis: { title: "y" } };
    expect(applyLayoutTheme(layout, "light")).toEqual({ xaxis: { title: "x" }, yaxis: { title: "y" } });
    expect(applyLayoutTheme(layout, undefined)).toEqual({ xaxis: { title: "x" }, yaxis: { title: "y" } });
  });

  test("recolours the background, text and every axis in the dark theme", () => {
    const layout: any = applyLayoutTheme({ xaxis: {}, yaxis: {}, yaxis2: {}, legend: {} }, "dark");
    expect(layout.paper_bgcolor).toBe("rgba(0, 0, 0, 0)");
    expect(layout.plot_bgcolor).toBe("rgba(0, 0, 0, 0)");
    expect(layout.font.color).toBe("#c4ccd5");
    ["xaxis", "yaxis", "yaxis2"].forEach((axis) => {
      expect(layout[axis]).toEqual({ gridcolor: "#29303a", zerolinecolor: "#3a434f", linecolor: "#3a434f" });
    });
    expect(layout.legend).toEqual({});
  });

  test("uses the app's theme tokens when they are defined", () => {
    document.documentElement.style.setProperty("--rd-text", "#abcdef");
    const layout: any = applyLayoutTheme({}, "dark");
    expect(layout.font.color).toBe("#abcdef");
  });
});
