import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./link";

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

describe("Visualizations -> Table -> Columns -> Link", () => {
  describe("Editor", () => {
    test("Changes URL template", done => {
      const el = mount(
        {
          name: "a",
          linkUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Link.UrlTemplate").pop()!), { target: { value: "http://{{ @ }}/index.html" } });
    });

    test("Changes text template", done => {
      const el = mount(
        {
          name: "a",
          linkTextTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Link.TextTemplate").pop()!), { target: { value: "Text of {{ @ }}" } });
    });

    test("Changes title template", done => {
      const el = mount(
        {
          name: "a",
          linkTitleTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Link.TitleTemplate").pop()!), { target: { value: "Title of {{ @ }}" } });
    });

    test("Makes link open in new tab ", done => {
      const el = mount(
        {
          name: "a",
          linkOpenInNewTab: false,
        },
        done
      );

      fireEvent.click(getInput(findByTestID("Table.ColumnEditor.Link.OpenInNewTab").pop()!));
    });
  });
});
