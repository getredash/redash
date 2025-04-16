import { after } from "lodash";
import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import ColorsSettings from "./ColorsSettings";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(options: any, done: any) {
  options = getOptions(options);
  return enzyme.mount(
    <ColorsSettings
      visualizationName="Test"
      data={{
        columns: [
          { name: "a", type: "string" },
          { name: "b", type: "number" },
        ],
        rows: [{ a: "v", b: 3.14 }],
      }}
      options={options}
      onOptionsChange={(changedOptions: any) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Chart -> Editor -> Colors Settings", () => {
  describe("for pie", () => {
    test("Changes series color", done => {
      const el = mount(
        {
          globalSeriesType: "pie",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      findByTestID(el, "Chart.Series.v.Color")
        .find(".color-picker-trigger")
        .last()
        .simulate("click");
      findByTestID(el, "ColorPicker")
        .last()
        .find("input")
        .simulate("change", { target: { value: "red" } });
    });
  });

  describe("for heatmap", () => {
    test("Changes color scheme", done => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      findByTestID(el, "Chart.Colors.Heatmap.ColorScheme")
        .last()
        .simulate("mouseDown");
      findByTestID(el, "Chart.Colors.Heatmap.ColorScheme.Blues")
        .last()
        .simulate("click");
    });

    test("Sets custom color scheme", done => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
          colorScheme: "Custom...",
        },
        after(2, done)
      ); // we will perform 2 actions, so call `done` after all of them completed

      findByTestID(el, "Chart.Colors.Heatmap.MinColor")
        .find(".color-picker-trigger")
        .last()
        .simulate("click");
      findByTestID(el, "ColorPicker")
        .last()
        .find("input")
        .simulate("change", { target: { value: "yellow" } });

      findByTestID(el, "Chart.Colors.Heatmap.MaxColor")
        .find(".color-picker-trigger")
        .last()
        .simulate("click");
      findByTestID(el, "ColorPicker")
        .last()
        .find("input")
        .simulate("change", { target: { value: "red" } });
    });
  });

  describe("for all except of pie and heatmap", () => {
    test("Changes series color", done => {
      const el = mount(
        {
          globalSeriesType: "column",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      findByTestID(el, "Chart.Series.b.Color")
        .find(".color-picker-trigger")
        .last()
        .simulate("click");

      findByTestID(el, "ColorPicker")
        .last()
        .find("input")
        .simulate("change", { target: { value: "red" } });
    });
  });
});
