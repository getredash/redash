import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import XAxisSettings from "./XAxisSettings";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(options: any, done: any) {
  options = getOptions(options);
  return enzyme.mount(
    <XAxisSettings
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

describe("Visualizations -> Chart -> Editor -> X-Axis Settings", () => {
  test("Changes axis type", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    findByTestID(el, "Chart.XAxis.Type")
      .last()
      .simulate("mouseDown");
    findByTestID(el, "Chart.XAxis.Type.Linear")
      .last()
      .simulate("click");
  });

  test("Changes axis name", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    findByTestID(el, "Chart.XAxis.Name")
      .last()
      .simulate("change", { target: { value: "test" } });
  });

  test("Changes axis tick format", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { },
      },
      done
    );

    findByTestID(el, "Chart.XAxis.TickFormat")
      .last()
      .simulate("change", { target: { value: "%B" } });
  });

  test("Sets Show Labels option", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: false } },
      },
      done
    );

    findByTestID(el, "Chart.XAxis.ShowLabels")
      .last()
      .simulate("click");
  });

  test("Sets Sort X Values option", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        sortX: false,
      },
      done
    );

    findByTestID(el, "Chart.XAxis.Sort")
      .last()
      .simulate("click");
  });

  test("Sets Reverse X Values option", done => {
    const el = mount(
      {
        globalSeriesType: "column",
        reverseX: false,
      },
      done
    );

    findByTestID(el, "Chart.XAxis.Reverse")
      .last()
      .simulate("click");
  });
});
