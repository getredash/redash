import React from "react";
import enzyme from "enzyme";

import Column from "./text";

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

describe("Visualizations -> Table -> Columns -> Text", () => {
  describe("Editor", () => {
    test("Enables HTML content", done => {
      const el = mount(
        {
          name: "a",
          allowHTML: false,
          highlightLinks: false,
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Text.AllowHTML")
        .last()
        .find("input")
        .simulate("change", { target: { checked: true } });
    });

    test("Enables highlight links option", done => {
      const el = mount(
        {
          name: "a",
          allowHTML: true,
          highlightLinks: false,
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Text.HighlightLinks")
        .last()
        .find("input")
        .simulate("change", { target: { checked: true } });
    });
  });
});
