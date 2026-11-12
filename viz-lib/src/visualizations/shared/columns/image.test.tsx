import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./image";
import { findByTestID, findInput } from "@/testUtils";

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

describe("Visualizations -> Table -> Columns -> Image", () => {
  describe("Editor", () => {
    test("Changes URL template", (done) => {
      mount(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Image.UrlTemplate")), {
        target: { value: "http://{{ @ }}.jpeg" },
      });
    });

    test("Changes width", (done) => {
      mount(
        {
          name: "a",
          imageWidth: null,
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Image.Width")), { target: { value: "400" } });
    });

    test("Changes height", (done) => {
      mount(
        {
          name: "a",
          imageHeight: null,
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Image.Height")), { target: { value: "300" } });
    });

    test("Changes title template", (done) => {
      mount(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Image.TitleTemplate")), {
        target: { value: "Image {{ @ }}" },
      });
    });
  });
});
