import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import GridSettings from "./GridSettings";
import { findByTestID, openSelect } from "@/testUtils";

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
