import React from "react";
import enzyme from "enzyme";

import getOptions from "./getOptions";
import Renderer from "./Renderer";

function mount(options) {
  const data = {
    columns: [
      { name: "city", type: "string" },
      { name: "population", type: "number" },
    ],
    rows: [
      { city: "New York City", population: 18604000 },
      { city: "Shanghai", population: 24484000 },
      { city: "Tokyo", population: 38140000 },
    ],
  };

  options = getOptions(options, data);
  return enzyme.mount(<Renderer visualizationName="Test" data={data} options={options} context="query" />);
}

describe("Visualizations -> Counter -> Renderer", () => {
  test("Invalid column", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "missing",
        rowNumber: 0,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "unused",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Numeric Primary Value", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "unused",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Non-numeric Primary Value", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "city",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "unused",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Numeric Secondary Value", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Non-numeric Secondary Value", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "rowValue",
        column: "city",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Trend positive", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 3,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("Trend negative", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
      secondaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 3,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: false,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });

  test("With tooltips", () => {
    const el = mount({
      schemaVersion: 2,
      primaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: true,
      },
      secondaryValue: {
        type: "rowValue",
        column: "population",
        rowNumber: 1,
        displayFormat: "{{ @@value_formatted }} / {{ @@value }}",
        showTooltip: true,
      },
    });
    expect(el.find(".counter-visualization-container")).toMatchSnapshot();
  });
});
