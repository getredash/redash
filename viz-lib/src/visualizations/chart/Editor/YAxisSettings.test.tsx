import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import YAxisSettings from "./YAxisSettings";
import { findByTestID, findInput, openSelect, elementExists } from "@/testUtils";

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
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
}

describe("Visualizations -> Chart -> Editor -> Y-Axis Settings", () => {
  test("Changes axis type", (done) => {
    mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    openSelect("Chart.LeftYAxis.Type");
    fireEvent.click(findByTestID("Chart.LeftYAxis.Type.Category"));
  });

  test("Changes axis name", (done) => {
    mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(findByTestID("Chart.LeftYAxis.Name"), { target: { value: "test" } });
  });

  test("Changes axis tick format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        yAxis: [],
      },
      done
    );

    fireEvent.change(findByTestID("Chart.LeftYAxis.TickFormat"), { target: { value: "s" } });
  });

  test("Changes axis min value", (done) => {
    mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(findInput(findByTestID("Chart.LeftYAxis.RangeMin")), { target: { value: "50" } });
  });

  test("Changes axis max value", (done) => {
    mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    fireEvent.change(findInput(findByTestID("Chart.LeftYAxis.RangeMax")), { target: { value: "200" } });
  });

  describe("for non-heatmap", () => {
    test("Right Y Axis should be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      mount({
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists("Chart.RightYAxis.Type")).toBeTruthy();
    });
  });

  describe("for heatmap", () => {
    test("Right Y Axis should not be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      mount({
        globalSeriesType: "heatmap",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists("Chart.RightYAxis.Type")).toBeFalsy();
    });

    test("Sets Sort X Values option", (done) => {
      mount(
        {
          globalSeriesType: "heatmap",
          sortY: false,
        },
        done
      );

      fireEvent.click(findByTestID("Chart.LeftYAxis.Sort"));
    });

    test("Sets Reverse Y Values option", (done) => {
      mount(
        {
          globalSeriesType: "heatmap",
          reverseY: false,
        },
        done
      );

      fireEvent.click(findByTestID("Chart.LeftYAxis.Reverse"));
    });
  });
});
