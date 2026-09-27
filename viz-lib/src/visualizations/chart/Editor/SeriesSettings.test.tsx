import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import SeriesSettings from "./SeriesSettings";
import { findByTestID, findInput, setChecked, openSelect } from "@/testUtils";

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
