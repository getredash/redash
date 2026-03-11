import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./datetime";

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

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.DateTime.Format").pop()!), { target: { value: "YYYY/MM/DD HH:ss" } });
    });
  });
});
