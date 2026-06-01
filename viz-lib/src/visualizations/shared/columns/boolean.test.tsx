import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./boolean";

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
      onChange={(changedColumn) => {
        expect(changedColumn).toMatchSnapshot();
        done();
      }}
    />
  );
  return container;
}

describe("Visualizations -> Table -> Columns -> Boolean", () => {
  describe("Editor", () => {
    test("Changes value for FALSE", (done) => {
      const el = mount(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Boolean.False").pop()!), { target: { value: "no" } });
    });

    test("Changes value for TRUE", (done) => {
      const el = mount(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Boolean.True").pop()!), { target: { value: "yes" } });
    });
  });
});
