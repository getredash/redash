import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import GeneralSettings from "./GeneralSettings";
import { findByTestID, findInput, setChecked, openSelect, elementExists } from "@/testUtils";

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
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
}

describe("Visualizations -> Chart -> Editor -> General Settings", () => {
  test("Changes global series type", (done) => {
    mount(
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
    fireEvent.click(findByTestID("Chart.ChartType.pie"));
  });

  test("Pie: changes direction", (done) => {
    mount(
      {
        globalSeriesType: "pie",
        direction: { type: "counterclockwise" },
      },
      done
    );

    openSelect("Chart.PieDirection");
    fireEvent.click(findByTestID("Chart.PieDirection.Clockwise"));
  });

  test("Toggles legend", (done) => {
    mount(
      {
        globalSeriesType: "column",
        legend: { enabled: true },
      },
      done
    );

    openSelect("Chart.LegendPlacement");
    fireEvent.click(findByTestID("Chart.LegendPlacement.HideLegend"));
  });

  test("Box: toggles show points", (done) => {
    mount(
      {
        globalSeriesType: "box",
        showpoints: false,
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.ShowPoints")), true);
  });

  test("Enables stacking", (done) => {
    mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    openSelect("Chart.Stacking");
    fireEvent.click(findByTestID("Chart.Stacking.Stack"));
  });

  test("Toggles normalize values to percentage", (done) => {
    mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.NormalizeValues")), true);
  });

  test("Keep missing/null values", (done) => {
    mount(
      {
        globalSeriesType: "column",
        missingValuesAsZero: true,
      },
      done
    );

    openSelect("Chart.MissingValues");
    fireEvent.click(findByTestID("Chart.MissingValues.Keep"));
  });

  describe("Column mappings should be available", () => {
    test("for bubble", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      mount({
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
      mount({
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
      mount({
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
    mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.SwappedAxes")), true);
  });

  test("Toggles Enable click events", (done) => {
    mount(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.EnableClickEvents")), true);
  });
});
