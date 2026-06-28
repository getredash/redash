import React from "react";
import enzyme from "enzyme";

import Column from "./text";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(column: any, done: any) {
  return enzyme.mount(
    <Column.Editor
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ visualizationName: string; column: any; on... Remove this comment to see the full error message
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
