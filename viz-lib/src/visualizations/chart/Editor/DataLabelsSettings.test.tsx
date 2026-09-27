import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import DataLabelsSettings from "./DataLabelsSettings";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd passes `data-test` either to a wrapper or to the <input> itself
function findInput(element: Element, selector = "input"): any {
  return element.matches(selector) ? element : element.querySelector(selector);
}

// Checkboxes and switches react to clicks; only click if the state actually needs to change.
function setChecked(input: HTMLInputElement, checked: boolean) {
  if (input.checked !== checked) {
    fireEvent.click(input);
  }
}

function mount(options: any, done: any) {
  options = getOptions(options);
  return render(
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
}

describe("Visualizations -> Chart -> Editor -> Data Labels Settings", () => {
  test("Sets Show Data Labels option", (done) => {
    mount(
      {
        globalSeriesType: "column",
        showDataLabels: false,
      },
      done
    );

    setChecked(findInput(findByTestID("Chart.DataLabels.ShowDataLabels")), true);
  });

  test("Changes number format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        numberFormat: "0[.]0000",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.NumberFormat"), { target: { value: "0.00" } });
  });

  test("Changes percent values format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        percentFormat: "0[.]00%",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.PercentFormat"), { target: { value: "0.0%" } });
  });

  test("Changes date/time format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.DateTimeFormat"), { target: { value: "YYYY MMM DD" } });
  });

  test("Changes data labels format", (done) => {
    mount(
      {
        globalSeriesType: "column",
        textFormat: null,
      },
      done
    );

    fireEvent.change(findByTestID("Chart.DataLabels.TextFormat"), {
      target: { value: "{{ @@x }} :: {{ @@y }} / {{ @@yPercent }}" },
    });
  });
});
