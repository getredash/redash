import React from "react";
import enzyme from "enzyme";

import Column from "./datetime";

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(column, done) {
  return enzyme.mount(
    <Column.Editor
      visualizationName="Test"
      column={column}
      onChange={changedColumn => {
        expect(changedColumn).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Table -> Columns -> Date/Time", () => {
  describe("Editor", () => {
    test("Changes format", done => {
      const el = mount(
        {
          name: "a",
          dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.DateTime.Format")
        .last()
        .find("input")
        .simulate("change", { target: { value: "YYYY/MM/DD HH:ss" } });
    });
  });
});
