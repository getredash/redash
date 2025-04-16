import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import YAxisSettings from "./YAxisSettings";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function elementExists(wrapper: any, testId: any) {
  return findByTestID(wrapper, testId).length > 0;
}

function mount(options: any, done: any) {
  options = getOptions(options);
  return enzyme.mount(
    <YAxisSettings
      visualizationName="Test"
      data={{ columns: [], rows: [] }}
      options={options}
      onOptionsChange={changedOptions => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Chart -> Editor -> Y-Axis Settings", () => {
  test("Changes axis type", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    findByTestID(el, "Chart.LeftYAxis.Type")
      .last()
      .simulate("mouseDown");
    findByTestID(el, "Chart.LeftYAxis.Type.Category")
      .last()
      .simulate("click");
  });

  test("Changes axis name", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    findByTestID(el, "Chart.LeftYAxis.Name")
      .last()
      .simulate("change", { target: { value: "test" } });
  });

  test("Changes axis tick format", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [],
      },
      done
    );

    findByTestID(el, "Chart.LeftYAxis.TickFormat")
      .last()
      .simulate("change", { target: { value: "s" } });
  });

  test("Changes axis min value", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    findByTestID(el, "Chart.LeftYAxis.RangeMin")
      .find("input")
      .last()
      .simulate("change", { target: { value: "50" } });
  });

  test("Changes axis max value", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    findByTestID(el, "Chart.LeftYAxis.RangeMax")
      .find("input")
      .last()
      .simulate("change", { target: { value: "200" } });
  });

  describe("for non-heatmap", () => {
    test("Right Y Axis should be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists(el, "Chart.RightYAxis.Type")).toBeTruthy();
    });
  });

  describe("for heatmap", () => {
    test("Right Y Axis should not be available", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      const el = mount({
        globalSeriesType: "heatmap",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists(el, "Chart.RightYAxis.Type")).toBeFalsy();
    });

    test("Sets Sort X Values option", done => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          sortY: false,
        },
        done
      );

      findByTestID(el, "Chart.LeftYAxis.Sort")
        .last()
        .simulate("click");
    });

    test("Sets Reverse Y Values option", done => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          reverseY: false,
        },
        done
      );

      findByTestID(el, "Chart.LeftYAxis.Reverse")
        .last()
        .simulate("click");
    });
  });
});
