import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./text";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd passes `data-test` either to a wrapper or to the <input> itself
function findInput(element: Element, selector = "input"): any {
  return element.matches(selector) ? element : element.querySelector(selector);
}

// Checkboxes and switches react to clicks; only click if the state actually needs to change.
function setChecked(input: HTMLInputElement, checked: boolean) {
  if (input.checked !== checked) {
    fireEvent.click(input);
  }
}

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
