import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import YAxisSettings from "./YAxisSettings";

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

function elementExists(testId: string) {
  return findByTestID(testId).length > 0;
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <YAxisSettings
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

describe("Visualizations -> Chart -> Editor -> Y-Axis Settings", () => {
  test("Changes axis type", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    openSelect("Chart.LeftYAxis.Type");
    clickOption("Chart.LeftYAxis.Type.Category");
  });

  test("Changes axis name", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(findByTestID("Chart.LeftYAxis.Name").pop()!, { target: { value: "test" } });
  });

  test("Changes axis tick format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [],
      },
      done
    );

    fireEvent.change(findByTestID("Chart.LeftYAxis.TickFormat").pop()!, { target: { value: "s" } });
  });

  test("Changes axis min value", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(getInput(findByTestID("Chart.LeftYAxis.RangeMin").pop()!), { target: { value: "50" } });
  });

  test("Changes axis max value", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(getInput(findByTestID("Chart.LeftYAxis.RangeMax").pop()!), { target: { value: "200" } });
  });

  describe("for non-heatmap", () => {
    test("Right Y Axis should be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists("Chart.RightYAxis.Type")).toBeTruthy();
    });
  });

  describe("for heatmap", () => {
    test("Right Y Axis should not be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "heatmap",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists("Chart.RightYAxis.Type")).toBeFalsy();
    });

    test("Sets Sort X Values option", (done) => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          sortY: false,
        },
        done
      );

      clickOption("Chart.LeftYAxis.Sort");
    });

    test("Sets Reverse Y Values option", (done) => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          reverseY: false,
        },
        done
      );

      clickOption("Chart.LeftYAxis.Reverse");
    });
  });
});
