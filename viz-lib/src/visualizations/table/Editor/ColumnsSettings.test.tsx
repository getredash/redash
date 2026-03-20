import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

function openSelect(testId: string) {
  const el = findByTestID(testId).pop()!;
  const selector = (el.matches(".ant-select") ? el : el.querySelector(".ant-select")) || el;
  fireEvent.mouseDown(selector);
}

function clickOption(testId: string) {
  const el = findByTestID(testId).pop();
  if (el) fireEvent.click(el);
}

function mount(options: any, done: any) {
  const data = {
    columns: [{ name: "a", type: "string" }],
    rows: [{ a: "test" }],
  };
  options = getOptions(options, data);
  const { container } = render(
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
  return container;
}

describe("Visualizations -> Table -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", (done) => {
    const el = mount({}, done);

    clickOption("Table.Column.a.Visibility");
  });

  test("Changes column title", (done) => {
    const el = mount({}, done);
    clickOption("Table.Column.a.Name"); // expand settings

    fireEvent.change(findByTestID("Table.Column.a.Title").pop()!, { target: { value: "test" } });
  });

  test("Changes column alignment", (done) => {
    const el = mount({}, done);
    clickOption("Table.Column.a.Name"); // expand settings

    const radio = document.body.querySelector('[data-test="TextAlignmentSelect.Right"]') as HTMLInputElement;
    fireEvent.click(radio);
  });

  test("Enables search by column data", (done) => {
    const el = mount({}, done);
    clickOption("Table.Column.a.Name"); // expand settings

    const checkbox = findByTestID("Table.Column.a.UseForSearch").pop()!;
    const cbInput = checkbox.querySelector("input[type='checkbox']") || checkbox;
    fireEvent.click(cbInput);
  });

  test("Changes column display type", (done) => {
    const el = mount({}, done);
    clickOption("Table.Column.a.Name"); // expand settings

    // Select doesn't have data-test on wrapper, find the ant-select in the expanded settings
    const selectSelector = document.body.querySelector(".ant-select")!;
    fireEvent.mouseDown(selectSelector);
    clickOption("Table.Column.a.DisplayAs.number");
  });
});
