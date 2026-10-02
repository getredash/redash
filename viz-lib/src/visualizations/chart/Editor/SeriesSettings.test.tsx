import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import SeriesSettings from "./SeriesSettings";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd's Select opens on mousedown on its selector element
function openSelect(testId: string) {
  const element = findByTestID(testId);
  fireEvent.mouseDown(element.querySelector(".ant-select-selector") || element);
}

// antd passes `data-test` either to a wrapper or to the <input> itself
function findInput(element: Element, selector = "input"): any {
  return element.matches(selector) ? element : element.querySelector(selector);
}

// Checkboxes and switches react to clicks; only click if the state actually needs to change.
function setChecked(input: HTMLInputElement, checked: boolean) {
  if (input.checked !== checked) {
    fireEvent.click(input);
  }
}

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
    <SeriesSettings
      visualizationName="Test"
      data={{ columns: [{ name: "a", type: "string" }], rows: [{ a: "test" }] }}
      options={options}
      onOptionsChange={(changedOptions: any) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Chart -> Editor -> Series Settings", () => {
  test("Changes series type", (done) => {
    mount(
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
    fireEvent.click(findByTestID("Chart.ChartType.area"));
  });

  test("Changes series label", (done) => {
    mount(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", label: "a", yAxis: 0 },
        },
      },
      done
    );

    fireEvent.change(findByTestID("Chart.Series.a.Label"), { target: { value: "test" } });
  });

  test("Changes series axis", (done) => {
    mount(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", name: "a", yAxis: 0 },
        },
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.Series.a.UseRightAxis")), true);
  });
});
