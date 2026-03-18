import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import GridSettings from "./GridSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function openSelect(testId: string) {
  const el = findByTestID(testId).pop()!;
  const selector = el.querySelector(".ant-select-selector") || el;
  fireEvent.mouseDown(selector);
}

function clickOption(testId: string) {
  const el = findByTestID(testId).pop();
  if (el) fireEvent.click(el);
}

function mount(options: any, done: any) {
  const data = { columns: [], rows: [] };
  options = getOptions(options, data);
  const { container } = render(
    <GridSettings
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={(changedOptions) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
  return container;
}

describe("Visualizations -> Table -> Editor -> Grid Settings", () => {
  test("Changes items per page", (done) => {
    const el = mount(
      {
        itemsPerPage: 25,
      },
      done
    );

    openSelect("Table.ItemsPerPage");
    clickOption("Table.ItemsPerPage.100");
  });
});
