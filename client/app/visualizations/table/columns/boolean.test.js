import React from "react";
import enzyme from "enzyme";

import Column from "./boolean";

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

describe("Visualizations -> Table -> Columns -> Boolean", () => {
  describe("Editor", () => {
    test("Changes value for FALSE", done => {
      const el = mount(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Boolean.False")
        .last()
        .find("input")
        .simulate("change", { target: { value: "no" } });
    });

    test("Changes value for TRUE", done => {
      const el = mount(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Boolean.True")
        .last()
        .find("input")
        .simulate("change", { target: { value: "yes" } });
    });
  });
});
