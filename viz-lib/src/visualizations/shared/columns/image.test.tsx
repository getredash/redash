import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./image";

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

describe("Visualizations -> Table -> Columns -> Image", () => {
  describe("Editor", () => {
    test("Changes URL template", done => {
      const el = mount(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Image.UrlTemplate").pop()!), { target: { value: "http://{{ @ }}.jpeg" } });
    });

    test("Changes width", done => {
      const el = mount(
        {
          name: "a",
          imageWidth: null,
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Image.Width").pop()!), { target: { value: "400" } });
    });

    test("Changes height", done => {
      const el = mount(
        {
          name: "a",
          imageHeight: null,
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Image.Height").pop()!), { target: { value: "300" } });
    });

    test("Changes title template", done => {
      const el = mount(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(getInput(findByTestID("Table.ColumnEditor.Image.TitleTemplate").pop()!), { target: { value: "Image {{ @ }}" } });
    });
  });
});
