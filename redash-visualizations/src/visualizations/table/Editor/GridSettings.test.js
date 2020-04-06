import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import GridSettings from "./GridSettings";

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(options, done) {
  const data = { columns: [], rows: [] };
  options = getOptions(options, data);
  return enzyme.mount(
    <GridSettings
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={changedOptions => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Table -> Editor -> Grid Settings", () => {
  test("Changes items per page", done => {
    const el = mount(
      {
        itemsPerPage: 25,
      },
      done
    );

    findByTestID(el, "Table.ItemsPerPage")
      .last()
      .simulate("click");
    findByTestID(el, "Table.ItemsPerPage.100")
      .last()
      .simulate("click");
  });
});
