import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./text";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

function mount(column: any, done: any) {
  const { container } = render(
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
  return container;
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

      fireEvent.click(getInput(findByTestID("Table.ColumnEditor.Text.AllowHTML").pop()!));
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

      fireEvent.click(getInput(findByTestID("Table.ColumnEditor.Text.HighlightLinks").pop()!));
    });
  });
});
