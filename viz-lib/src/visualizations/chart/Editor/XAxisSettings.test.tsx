import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import XAxisSettings from "./XAxisSettings";
import { findByTestID, openSelect } from "@/testUtils";

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
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
}

describe("Visualizations -> Chart -> Editor -> X-Axis Settings", () => {
  test("Changes axis type", (done) => {
    mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    openSelect("Chart.XAxis.Type");
    fireEvent.click(findByTestID("Chart.XAxis.Type.Linear"));
  });

  test("Changes axis name", (done) => {
    mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    fireEvent.change(findByTestID("Chart.XAxis.Name"), { target: { value: "test" } });
  });

  test("Changes axis tick format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        xAxis: {},
      },
      done
    );

    fireEvent.change(findByTestID("Chart.XAxis.TickFormat"), { target: { value: "%B" } });
  });

  test("Sets Show Labels option", (done) => {
    mount(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: false } },
      },
      done
    );

    fireEvent.click(findByTestID("Chart.XAxis.ShowLabels"));
  });

  test("Sets Sort X Values option", (done) => {
    mount(
      {
        globalSeriesType: "column",
        sortX: false,
      },
      done
    );

    fireEvent.click(findByTestID("Chart.XAxis.Sort"));
  });

  test("Sets Reverse X Values option", (done) => {
    mount(
      {
        globalSeriesType: "column",
        reverseX: false,
      },
      done
    );

    fireEvent.click(findByTestID("Chart.XAxis.Reverse"));
  });
});
