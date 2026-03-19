import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import DataLabelsSettings from "./DataLabelsSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <DataLabelsSettings
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

describe("Visualizations -> Chart -> Editor -> Data Labels Settings", () => {
  test("Sets Show Data Labels option", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        showDataLabels: false,
      },
      done
    );

    fireEvent.click(getInput(findByTestID("Chart.DataLabels.ShowDataLabels").pop()!));
  });

  test("Changes number format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        numberFormat: "0[.]0000",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.NumberFormat").pop()!, { target: { value: "0.00" } });
  });

  test("Changes percent values format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        percentFormat: "0[.]00%",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.PercentFormat").pop()!, { target: { value: "0.0%" } });
  });

  test("Changes date/time format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.DateTimeFormat").pop()!, { target: { value: "YYYY MMM DD" } });
  });

  test("Changes data labels format", (done) => {
    const el = mount(
      {
        globalSeriesType: "column",
        textFormat: null,
      },
      done
    );

    fireEvent.change(getInput(findByTestID("Chart.DataLabels.TextFormat").pop()!), {
      target: { value: "{{ @@x }} :: {{ @@y }} / {{ @@yPercent }}" },
    });
  });
});
