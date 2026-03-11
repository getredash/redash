import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import Editor from "./index";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function elementExists(testId: string) {
  return findByTestID(testId).length > 0;
}

function mount(options: any, data: any) {
  options = getOptions(options);
  const { container } = render(<Editor visualizationName="Test" data={data} options={options} onOptionsChange={() => {}} />);
  return container;
}

describe("Visualizations -> Chart -> Editor (wrapper)", () => {
  test("Renders generic wrapper", () => {
    const el = mount({ globalSeriesType: "column" }, { columns: [], rows: [] });

    expect(elementExists("VisualizationEditor.Tabs.General")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.XAxis")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.YAxis")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.Series")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.Colors")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.DataLabels")).toBeTruthy();

    expect(elementExists("Chart.GlobalSeriesType")).toBeTruthy(); // general settings block exists
    expect(elementExists("Chart.Custom.Code")).toBeFalsy(); // custom settings block does not exist
  });

  test("Renders wrapper for custom charts", () => {
    const el = mount({ globalSeriesType: "custom" }, { columns: [], rows: [] });

    expect(elementExists("VisualizationEditor.Tabs.General")).toBeTruthy();
    expect(elementExists("VisualizationEditor.Tabs.XAxis")).toBeFalsy();
    expect(elementExists("VisualizationEditor.Tabs.YAxis")).toBeFalsy();
    expect(elementExists("VisualizationEditor.Tabs.Series")).toBeFalsy();
    expect(elementExists("VisualizationEditor.Tabs.Colors")).toBeFalsy();
    expect(elementExists("VisualizationEditor.Tabs.DataLabels")).toBeFalsy();

    expect(elementExists("Chart.GlobalSeriesType")).toBeTruthy(); // general settings block exists
    expect(elementExists("Chart.Custom.Code")).toBeTruthy(); // custom settings block exists
  });
});
