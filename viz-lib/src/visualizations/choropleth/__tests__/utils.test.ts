jest.mock("@/lib/value-format", () => ({
  createNumberFormatter: () => (v: any) => String(v),
}));

import { get } from "lodash";
import { prepareData, prepareFeatureProperties, getValueForFeature, getColorByValue } from "../Renderer/utils";
import { getGeoJsonFields } from "../Editor/utils";

describe("prepareData", () => {
  test("returns empty object when keyColumn is null", () => {
    expect(prepareData([{ a: 1 }], null, "a")).toEqual({});
  });

  test("returns empty object when valueColumn is null", () => {
    expect(prepareData([{ a: 1 }], "a", null)).toEqual({});
  });

  test("creates lookup from rows", () => {
    const rows = [
      { region: "Region_A", value: 42 },
      { region: "Region_B", value: 15 },
    ];
    const result = prepareData(rows, "region", "value");
    expect(result).toHaveProperty("Region_A");
    expect((result as any).Region_A.value).toBe(42);
    expect((result as any).Region_A.code).toBe("Region_A");
    expect((result as any).Region_B.value).toBe(15);
  });

  test("handles non-numeric values as undefined", () => {
    const rows = [{ region: "Region_A", value: "not-a-number" }];
    const result = prepareData(rows, "region", "value");
    expect((result as any).Region_A.value).toBeUndefined();
  });

  test("skips rows with falsy key", () => {
    const rows = [
      { region: "", value: 10 },
      { region: null, value: 20 },
      { region: "Valid", value: 30 },
    ];
    const result = prepareData(rows, "region", "value");
    expect(Object.keys(result)).toEqual(["Valid"]);
  });
});

describe("getValueForFeature", () => {
  const data = {
    Region_A: { code: "Region_A", value: 42 },
    Region_B: { code: "Region_B", value: 15 },
  };

  test("returns value for matching string property", () => {
    const feature = { properties: { NAME_1: "Region_A" } };
    expect(getValueForFeature(feature, data, "NAME_1")).toBe(42);
  });

  test("returns undefined for non-matching property", () => {
    const feature = { properties: { NAME_1: "Unknown" } };
    expect(getValueForFeature(feature, data, "NAME_1")).toBeUndefined();
  });

  test("returns undefined for numeric property (isString check)", () => {
    const feature = { properties: { id: 123 } };
    expect(getValueForFeature(feature, { 123: { value: 10 } }, "id")).toBeUndefined();
  });

  test("returns undefined for missing targetField", () => {
    const feature = { properties: { NAME_1: "Region_A" } };
    expect(getValueForFeature(feature, data, "nonexistent")).toBeUndefined();
  });
});

describe("getGeoJsonFields", () => {
  test("extracts unique property keys from features", () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "A", iso_a2: "US" }, geometry: {} },
        { type: "Feature", properties: { name: "B", code: "GB" }, geometry: {} },
      ],
    };
    const fields = getGeoJsonFields(geoJson);
    expect(fields).toContain("name");
    expect(fields).toContain("iso_a2");
    expect(fields).toContain("code");
  });

  test("returns empty array for null geoJson", () => {
    expect(getGeoJsonFields(null)).toEqual([]);
  });

  test("returns empty array for geoJson without features", () => {
    expect(getGeoJsonFields({ type: "FeatureCollection" })).toEqual([]);
  });
});

describe("GeoJSON fieldNames mapping", () => {
  test("optional top-level fieldNames provides human-readable labels", () => {
    const geoJson = {
      type: "FeatureCollection",
      fieldNames: { iso_a2: "Country Code", name: "Country Name" },
      features: [{ type: "Feature", properties: { name: "USA", iso_a2: "US" }, geometry: {} }],
    };

    // Simulate what GeneralSettings does: read fieldNames from GeoJSON
    const geoJsonFieldNames: Record<string, string> = get(geoJson, "fieldNames", {});
    expect(geoJsonFieldNames).toEqual({ iso_a2: "Country Code", name: "Country Name" });

    // Labels fall back to raw field name when fieldNames is absent
    const fields = getGeoJsonFields(geoJson);
    fields.forEach((field: string) => {
      const label = geoJsonFieldNames[field] || field;
      expect(label).toBeDefined();
    });
    expect(geoJsonFieldNames["iso_a2"]).toBe("Country Code");
  });

  test("missing fieldNames falls back to empty object", () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { name: "A" }, geometry: {} }],
    };
    const geoJsonFieldNames: Record<string, string> = get(geoJson, "fieldNames", {});
    expect(geoJsonFieldNames).toEqual({});

    const fields = getGeoJsonFields(geoJson);
    expect(fields).toContain("name");
    // Without fieldNames, label is the raw field name
    expect(geoJsonFieldNames["name"] || "name").toBe("name");
  });
});

describe("prepareFeatureProperties", () => {
  const data = {
    Baringo: { code: "Baringo", value: 73.6, item: { county: "Baringo", pct: 73.6 } },
  };

  test("aliases @@name to the target field value for custom GeoJSON", () => {
    const feature = { properties: { NAME_1: "Baringo", ID_1: "1" } };
    const result = prepareFeatureProperties(feature, "73.60", data, "NAME_1");
    expect(result["@@NAME_1"]).toBe("Baringo");
    expect(result["@@name"]).toBe("Baringo");
    expect(result["@@value"]).toBe("73.60");
  });

  test("does not override existing @@name property", () => {
    const feature = { properties: { name: "Kenya", NAME_1: "Baringo" } };
    const result = prepareFeatureProperties(feature, "73.60", data, "NAME_1");
    expect(result["@@name"]).toBe("Kenya");
  });

  test("sets @@value to formatted value", () => {
    const feature = { properties: { NAME_1: "Baringo" } };
    const result = prepareFeatureProperties(feature, "N/A", data, "NAME_1");
    expect(result["@@value"]).toBe("N/A");
  });

  test("merges data item properties into result", () => {
    const feature = { properties: { NAME_1: "Baringo" } };
    const result = prepareFeatureProperties(feature, "73.60", data, "NAME_1");
    expect(result["county"]).toBe("Baringo");
    expect(result["pct"]).toBe(73.6);
  });
});

describe("getColorByValue", () => {
  const limits = [10, 20, 30];
  const colors = ["#aaa", "#bbb", "#ccc"];

  test("returns first color for values <= first limit", () => {
    expect(getColorByValue(5, limits, colors, "#default")).toBe("#aaa");
    expect(getColorByValue(10, limits, colors, "#default")).toBe("#aaa");
  });

  test("returns correct bucket color", () => {
    expect(getColorByValue(15, limits, colors, "#default")).toBe("#bbb");
    expect(getColorByValue(25, limits, colors, "#default")).toBe("#ccc");
  });

  test("returns default for non-finite values", () => {
    expect(getColorByValue(undefined, limits, colors, "#default")).toBe("#default");
    expect(getColorByValue(NaN, limits, colors, "#default")).toBe("#default");
    expect(getColorByValue(null, limits, colors, "#default")).toBe("#default");
  });
});
