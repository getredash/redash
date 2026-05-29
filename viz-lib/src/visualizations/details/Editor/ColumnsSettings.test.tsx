import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
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
  return enzyme.mount(
    <ColumnsSettings
      visualizationName="Details"
      data={data}
      options={options}
      onOptionsChange={changedOptions => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Details -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", done => {
    const el = mount({}, done);

    findByTestID(el, "Details.Column.id.Visibility")
      .last()
      .simulate("click");
  });

  test("Changes column title", done => {
    const el = mount({}, done);
    findByTestID(el, "Details.Column.name.Name")
      .last()
      .simulate("click"); // expand settings

    findByTestID(el, "Details.Column.name.Title")
      .last()
      .simulate("change", { target: { value: "Full Name" } });
  });

  test("Changes column alignment", done => {
    const el = mount({}, done);
    findByTestID(el, "Details.Column.id.Name")
      .last()
      .simulate("click"); // expand settings

    findByTestID(el, "Details.Column.id.TextAlignment")
      .last()
      .find('[data-test="TextAlignmentSelect.Center"] input')
      .simulate("change", { target: { checked: true } });
  });

  test("Changes column description", done => {
    const el = mount({}, done);
    findByTestID(el, "Details.Column.name.Name")
      .last()
      .simulate("click"); // expand settings

    findByTestID(el, "Details.Column.name.Description")
      .last()
      .simulate("change", { target: { value: "User full name" } });
  });

  test("Changes column display type", done => {
    const el = mount({}, done);
    findByTestID(el, "Details.Column.created_at.Name")
      .last()
      .simulate("click"); // expand settings

    findByTestID(el, "Details.Column.created_at.DisplayAs")
      .last()
      .simulate("mouseDown");
    findByTestID(el, "Details.Column.created_at.DisplayAs.string")
      .last()
      .simulate("click");
  });

  test("Hides multiple columns", done => {
    const el = mount({}, done);

    findByTestID(el, "Details.Column.id.Visibility")
      .last()
      .simulate("click");
  });
});
