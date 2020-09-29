import React from "react";
import enzyme from "enzyme";

import Column from "./number";

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

describe("Visualizations -> Table -> Columns -> Number", () => {
  describe("Editor", () => {
    test("Changes format", done => {
      const el = mount(
        {
          name: "a",
          numberFormat: "0[.]0000",
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Number.Format")
        .last()
        .find("input")
        .simulate("change", { target: { value: "0.00%" } });
    });
  });
});
