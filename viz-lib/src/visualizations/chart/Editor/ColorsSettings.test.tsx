import { after } from "lodash";
import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColorsSettings from "./ColorsSettings";
import { findByTestID, findInput, openSelect } from "@/testUtils";

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
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
    test("Changes series color", (done) => {
      mount(
        {
          globalSeriesType: "pie",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      fireEvent.click(findByTestID("Chart.Series.v.Color").querySelector(".color-picker-trigger"));
      fireEvent.change(findInput(findByTestID("ColorPicker")), { target: { value: "red" } });
    });
  });

  describe("for heatmap", () => {
    test("Changes color scheme", (done) => {
      mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      openSelect("Chart.Colors.Heatmap.ColorScheme");
      fireEvent.click(findByTestID("Chart.Colors.Heatmap.ColorScheme.Blues"));
    });

    test("Sets custom color scheme", (done) => {
      mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
          colorScheme: "Custom...",
        },
        after(2, done)
      ); // we will perform 2 actions, so call `done` after all of them completed

      fireEvent.click(findByTestID("Chart.Colors.Heatmap.MinColor").querySelector(".color-picker-trigger"));
      fireEvent.change(findInput(findByTestID("ColorPicker")), { target: { value: "yellow" } });

      fireEvent.click(findByTestID("Chart.Colors.Heatmap.MaxColor").querySelector(".color-picker-trigger"));
      fireEvent.change(findInput(findByTestID("ColorPicker")), { target: { value: "red" } });
    });
  });

  describe("for all except of pie and heatmap", () => {
    test("Changes series color", (done) => {
      mount(
        {
          globalSeriesType: "column",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      fireEvent.click(findByTestID("Chart.Series.b.Color").querySelector(".color-picker-trigger"));

      fireEvent.change(findInput(findByTestID("ColorPicker")), { target: { value: "red" } });
    });
  });
});
