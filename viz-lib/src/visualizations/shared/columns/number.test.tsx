import React from "react";
import enzyme from "enzyme";

import Column from "./number";

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
