import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
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
    columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "string" },
      { name: "created_at", type: "datetime" },
    ],
    rows: [{ id: 1, name: "test", created_at: "2023-01-01T00:00:00Z" }],
  };
  options = getOptions(options, data);
  const { container } = render(
    <ColumnsSettings
      visualizationName="Details"
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

describe("Visualizations -> Details -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", (done) => {
    const el = mount({}, done);

    clickOption("Details.Column.id.Visibility");
  });

  test("Changes column title", (done) => {
    const el = mount({}, done);
    clickOption("Details.Column.name.Name"); // expand settings

    fireEvent.change(findByTestID("Details.Column.name.Title").pop()!, { target: { value: "Full Name" } });
  });

  test("Changes column alignment", (done) => {
    const el = mount({}, done);
    clickOption("Details.Column.id.Name"); // expand settings

    const radio = document.body.querySelector('[data-test="TextAlignmentSelect.Center"]') as HTMLInputElement;
    fireEvent.click(radio);
  });

  test("Changes column description", (done) => {
    const el = mount({}, done);
    clickOption("Details.Column.name.Name"); // expand settings

    fireEvent.change(findByTestID("Details.Column.name.Description").pop()!, { target: { value: "User full name" } });
  });

  test("Changes column display type", (done) => {
    const el = mount({}, done);
    clickOption("Details.Column.created_at.Name"); // expand settings

    const selectSelector = document.body.querySelector(".ant-select")!;
    fireEvent.mouseDown(selectSelector);
    clickOption("Details.Column.created_at.DisplayAs.string");
  });

  test("Hides multiple columns", (done) => {
    const el = mount({}, done);

    clickOption("Details.Column.id.Visibility");
  });
});
