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
  return render(
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
}

describe("Visualizations -> Details -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", (done) => {
    mount({}, done);

    fireEvent.click(findByTestID("Details.Column.id.Visibility"));
  });

  test("Changes column title", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Details.Column.name.Name")); // expand settings

    fireEvent.change(findByTestID("Details.Column.name.Title"), { target: { value: "Full Name" } });
  });

  test("Changes column alignment", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Details.Column.id.Name")); // expand settings

    fireEvent.click(
      findByTestID("Details.Column.id.TextAlignment").querySelector('[data-test="TextAlignmentSelect.Center"]')
    );
  });

  test("Changes column description", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Details.Column.name.Name")); // expand settings

    fireEvent.change(findByTestID("Details.Column.name.Description"), { target: { value: "User full name" } });
  });

  test("Changes column display type", (done) => {
    mount({}, done);
    fireEvent.click(findByTestID("Details.Column.created_at.Name")); // expand settings

    openSelect("Details.Column.created_at.DisplayAs");
    fireEvent.click(findByTestID("Details.Column.created_at.DisplayAs.string"));
  });

  test("Hides multiple columns", (done) => {
    mount({}, done);

    fireEvent.click(findByTestID("Details.Column.id.Visibility"));
  });
});
