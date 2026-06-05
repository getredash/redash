import { createNumberFormatter } from "./value-format";
import { updateVisualizationsSettings } from "@/visualizations/visualizationsSettings";

// numeral keeps a single global locale, so reset the defaults around every test — before,
// so the suite is order-independent even if an earlier suite mutated the delimiters, and
// after, so it doesn't leak overrides into unrelated specs.
beforeEach(() => {
  updateVisualizationsSettings({ thousandsSeparator: ",", decimalSeparator: "." });
});

afterEach(() => {
  updateVisualizationsSettings({ thousandsSeparator: ",", decimalSeparator: "." });
});

describe("createNumberFormatter", () => {
  test("uses the default en delimiters", () => {
    expect(createNumberFormatter("0,0")(1234567)).toBe("1,234,567");
    expect(createNumberFormatter("0,0.00")(1234567.89)).toBe("1,234,567.89");
  });

  test("applies a custom thousands separator (the reported space case)", () => {
    updateVisualizationsSettings({ thousandsSeparator: " " });
    expect(createNumberFormatter("0,0")(1234567)).toBe("1 234 567");
  });

  test("applies continental-European separators together", () => {
    updateVisualizationsSettings({ thousandsSeparator: " ", decimalSeparator: "," });
    expect(createNumberFormatter("0,0.00")(1234567.89)).toBe("1 234 567,89");
  });

  test("applies one separator independently while the other stays default", () => {
    updateVisualizationsSettings({ thousandsSeparator: " " });
    expect(createNumberFormatter("0,0.00")(1234567.5)).toBe("1 234 567.50");
  });

  test("falls back to default separators for non-string overrides", () => {
    updateVisualizationsSettings({ thousandsSeparator: undefined, decimalSeparator: undefined });
    expect(createNumberFormatter("0,0.00")(1234.5)).toBe("1,234.50");
  });
});
