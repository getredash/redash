import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd's Select opens on mousedown on its selector element
function openSelect(testId: string) {
  const element = findByTestID(testId);
  fireEvent.mouseDown(element.querySelector(".ant-select-selector") || element);
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
  const data = {
    columns: [{ name: "a", type: "string" }],
    rows: [{ a: "test" }],
  };
  options = getOptions(options, data);
  return render(
    <ColumnsSettings
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={(changedOptions: any) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Table -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", (done) => {
    mount({}, done);

    fireEvent.click(findByTestID("Table.Column.a.Visibility"));
  });

  test("Changes column title", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Table.Column.a.Name")); // expand settings

    fireEvent.change(findByTestID("Table.Column.a.Title"), { target: { value: "test" } });
  });

  test("Changes column alignment", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Table.Column.a.Name")); // expand settings

    fireEvent.click(
      findByTestID("Table.Column.a.TextAlignment").querySelector('[data-test="TextAlignmentSelect.Right"]')
    );
  });

  test("Enables search by column data", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Table.Column.a.Name")); // expand settings

    setChecked(findInput(findByTestID("Table.Column.a.UseForSearch")), true);
  });

  test("Changes column display type", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Table.Column.a.Name")); // expand settings

    openSelect("Table.Column.a.DisplayAs");
    fireEvent.click(findByTestID("Table.Column.a.DisplayAs.number"));
  });
});
