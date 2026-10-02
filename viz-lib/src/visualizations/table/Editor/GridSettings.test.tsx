import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import GridSettings from "./GridSettings";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd's Select opens on mousedown on its selector element
function openSelect(testId: string) {
  const element = findByTestID(testId);
  fireEvent.mouseDown(element.querySelector(".ant-select-selector") || element);
}

function mount(options: any, done: any) {
  const data = { columns: [], rows: [] };
  options = getOptions(options, data);
  return render(
    <GridSettings
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

describe("Visualizations -> Table -> Editor -> Grid Settings", () => {
  test("Changes items per page", (done) => {
    mount(
      {
        itemsPerPage: 25,
      },
      done
    );

    openSelect("Table.ItemsPerPage");
    fireEvent.click(findByTestID("Table.ItemsPerPage.100"));
  });
});
