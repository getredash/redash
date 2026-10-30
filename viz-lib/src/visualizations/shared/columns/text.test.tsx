import React from "react";
import { render } from "@testing-library/react";

import Column from "./text";
import { findByTestID, findInput, setChecked } from "@/testUtils";

function mount(column: any, done: any) {
  return render(
    <Column.Editor
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ visualizationName: string; column: any; on... Remove this comment to see the full error message
      visualizationName="Test"
      column={column}
      onChange={(changedColumn) => {
        expect(changedColumn).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Table -> Columns -> Text", () => {
  describe("Editor", () => {
    test("Enables HTML content", (done) => {
      mount(
        {
          name: "a",
          allowHTML: false,
          highlightLinks: false,
        },
        done
      );

      setChecked(findInput(findByTestID("Table.ColumnEditor.Text.AllowHTML")), true);
    });

    test("Enables highlight links option", (done) => {
      mount(
        {
          name: "a",
          allowHTML: true,
          highlightLinks: false,
        },
        done
      );

      setChecked(findInput(findByTestID("Table.ColumnEditor.Text.HighlightLinks")), true);
    });
  });
});
