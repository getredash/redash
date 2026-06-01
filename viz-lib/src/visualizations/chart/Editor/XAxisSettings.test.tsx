import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import XAxisSettings from "./XAxisSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function openSelect(testId: string) {
  const el = findByTestID(testId).pop()!;
  const selector = (el.matches(".ant-select") ? el : el.querySelector(".ant-select")) || el;
  fireEvent.mouseDown(selector);
}

function clickOption(testId: string) {
  const el = findByTestID(testId).pop();
  if (el) fireEvent.click(el);
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <XAxisSettings
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

describe("Visualizations -> Chart -> Editor -> X-Axis Settings", () => {
  test("Changes axis type", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    openSelect("Chart.XAxis.Type");
    clickOption("Chart.XAxis.Type.Linear");
  });

  test("Changes axis name", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    fireEvent.change(findByTestID("Chart.XAxis.Name").pop()!, { target: { value: "test" } });
  });

  test("Changes axis tick format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: {},
      },
      done
    );

    fireEvent.change(findByTestID("Chart.XAxis.TickFormat").pop()!, { target: { value: "%B" } });
  });

  test("Sets Show Labels option", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: false } },
      },
      done
    );

    clickOption("Chart.XAxis.ShowLabels");
  });

  test("Sets Sort X Values option", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        sortX: false,
      },
      done
    );

    clickOption("Chart.XAxis.Sort");
  });

  test("Sets Reverse X Values option", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        reverseX: false,
      },
      done
    );

    clickOption("Chart.XAxis.Reverse");
  });
});
