import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import GeneralSettings from "./GeneralSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

function openSelect(testId: string) {
  const el = findByTestID(testId).pop()!;
  const selector = el.querySelector(".ant-select-selector") || el;
  fireEvent.mouseDown(selector);
}

function clickOption(testId: string) {
  const el = findByTestID(testId).pop();
  if (el) {
    fireEvent.click(el);
    return;
  }
  // Try by title as fallback for antd options that may not preserve data-test
  const option = document.body.querySelector(`[data-test="${testId}"]`);
  if (option) fireEvent.click(option);
}

function elementExists(testId: string) {
  return findByTestID(testId).length > 0;
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <GeneralSettings
      visualizationName="Test"
      data={{ columns: [], rows: [] }}
      options={options}
      onOptionsChange={(changedOptions: any) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
  return container;
}

describe("Visualizations -> Chart -> Editor -> General Settings", () => {
  test("Changes global series type", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        showDataLabels: false,
        seriesOptions: {
          a: { type: "column" },
          b: { type: "line" },
        },
      },
      done
    );

    openSelect("Chart.GlobalSeriesType");
    clickOption("Chart.ChartType.pie");
  });

  test("Pie: changes direction", (done) => {
    const el = mount(
      {
        globalSeriesType: "pie",
        direction: { type: "counterclockwise" },
      },
      done
    );

    openSelect("Chart.PieDirection");
    clickOption("Chart.PieDirection.Clockwise");
  });

  test("Toggles legend", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        legend: { enabled: true },
      },
      done
    );

    openSelect("Chart.LegendPlacement");
    clickOption("Chart.LegendPlacement.HideLegend");
  });

  test("Box: toggles show points", (done) => {
    const el = mount(
      {
        globalSeriesType: "box",
        showpoints: false,
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.ShowPoints").pop()!));
  });

  test("Enables stacking", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    openSelect("Chart.Stacking");
    clickOption("Chart.Stacking.Stack");
  });

  test("Toggles normalize values to percentage", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.NormalizeValues").pop()!));
  });

  test("Keep missing/null values", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        missingValuesAsZero: true,
      },
      done
    );

    openSelect("Chart.MissingValues");
    clickOption("Chart.MissingValues.Keep");
  });

  describe("Column mappings should be available", () => {
    test("for bubble", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "column",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists("Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.size")).toBeTruthy();
    });

    test("for heatmap", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "heatmap",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists("Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.zVal")).toBeTruthy();
    });

    test("for all types except of bubble, heatmap and custom", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "column",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists("Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.series")).toBeTruthy();
      expect(elementExists("Chart.ColumnMapping.yError")).toBeTruthy();
    });
  });

  test("Toggles horizontal bar chart", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.SwappedAxes").pop()!));
  });

  test("Toggles Enable click events", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.EnableClickEvents").pop()!));
  });
});
