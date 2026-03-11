import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./number";

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

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Number.Format").pop()!), { target: { value: "0.00%" } });
    });
  });
});
