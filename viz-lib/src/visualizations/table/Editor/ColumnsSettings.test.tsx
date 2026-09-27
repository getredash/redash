import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";
import { findByTestID, findInput, setChecked, openSelect } from "@/testUtils";

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
