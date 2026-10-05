import getOptions from "../getOptions";

jest.mock("@/visualizations/visualizationsSettings", () => ({
  visualizationsSettings: {
    choroplethAvailableMaps: {
      countries: { name: "Countries", url: "/countries.geo.json", fieldNames: {} },
      usa: { name: "USA", url: "/usa.geo.json", fieldNames: {} },
      custom_map_42: { name: "Kenya Counties", url: "/api/custom_maps/42/geojson" },
    },
  },
}));

describe("Choropleth getOptions", () => {
  test("returns defaults when called with empty options", () => {
    const result = getOptions({});
    expect(result.mapType).toBe("countries");
    expect(result.keyColumn).toBeNull();
    expect(result.targetField).toBeNull();
    expect(result.valueColumn).toBeNull();
    expect(result.steps).toBe(5);
  });

  test("preserves valid built-in mapType", () => {
    const result = getOptions({ mapType: "usa" });
    expect(result.mapType).toBe("usa");
  });

  test("falls back to first map for invalid mapType", () => {
    const result = getOptions({ mapType: "nonexistent" });
    expect(result.mapType).toBe("countries");
  });

  test("preserves valid custom map key", () => {
    const result = getOptions({ mapType: "custom_map_42" });
    expect(result.mapType).toBe("custom_map_42");
  });

  test("backward compat: countryCodeColumn migrates to keyColumn", () => {
    const result = getOptions({ countryCodeColumn: "iso" });
    expect(result.keyColumn).toBe("iso");
    expect(result.countryCodeColumn).toBeUndefined();
  });

  test("backward compat: countryCodeType migrates to targetField", () => {
    const result = getOptions({ countryCodeType: "iso_a3" });
    expect(result.targetField).toBe("iso_a3");
    expect(result.countryCodeType).toBeUndefined();
  });

  test("merges color options with defaults", () => {
    const result = getOptions({ colors: { min: "#ff0000" } });
    expect(result.colors.min).toBe("#ff0000");
    expect(result.colors.max).toBeDefined();
    expect(result.colors.background).toBeDefined();
  });

  test("preserves bounds from options", () => {
    const bounds = [
      [1, 2],
      [3, 4],
    ];
    const result = getOptions({ bounds });
    expect(result.bounds).toBe(bounds);
  });
});
