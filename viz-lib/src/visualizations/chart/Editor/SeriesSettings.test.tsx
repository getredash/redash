import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import SeriesSettings from "./SeriesSettings";

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
  if (el) fireEvent.click(el);
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <SeriesSettings
      visualizationName="Test"
      data={{ columns: [{ name: "a", type: "string" }], rows: [{ a: "test" }] }}
      options={options}
      onOptionsChange={(changedOptions) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
  return container;
}

describe("Visualizations -> Chart -> Editor -> Series Settings", () => {
  test("Changes series type", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", label: "a", yAxis: 0 },
        },
      },
      done
    );

    openSelect("Chart.Series.a.Type");
    clickOption("Chart.ChartType.area");
  });

  test("Changes series label", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", label: "a", yAxis: 0 },
        },
      },
      done
    );

    fireEvent.change(findByTestID("Chart.Series.a.Label").pop()!, { target: { value: "test" } });
  });

  test("Changes series axis", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", name: "a", yAxis: 0 },
        },
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.Series.a.UseRightAxis").pop()!));
  });
});
