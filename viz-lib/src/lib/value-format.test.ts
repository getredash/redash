import { createNumberFormatter } from "./value-format";
import { updateVisualizationsSettings } from "@/visualizations/visualizationsSettings";

// numeral keeps a single global locale, so restore the defaults after each test
// to avoid leaking separator overrides into unrelated specs.
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

  test("ignores non-string separator overrides", () => {
    updateVisualizationsSettings({ thousandsSeparator: undefined, decimalSeparator: undefined });
    expect(createNumberFormatter("0,0.00")(1234.5)).toBe("1,234.50");
  });
});
