import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./datetime";

function findByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

// antd passes `data-test` either to a wrapper or to the <input> itself
function findInput(element: Element, selector = "input"): any {
  return element.matches(selector) ? element : element.querySelector(selector);
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

describe("Visualizations -> Table -> Columns -> Date/Time", () => {
  describe("Editor", () => {
    test("Changes format", (done) => {
      mount(
        {
          name: "a",
          dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.DateTime.Format")), {
        target: { value: "YYYY/MM/DD HH:ss" },
      });
    });
  });
});
