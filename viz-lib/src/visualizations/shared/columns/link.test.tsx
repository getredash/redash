import React from "react";
import { render, fireEvent } from "@testing-library/react";

import Column from "./link";
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

describe("Visualizations -> Table -> Columns -> Link", () => {
  describe("Editor", () => {
    test("Changes URL template", (done) => {
      mount(
        {
          name: "a",
          linkUrlTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Link.UrlTemplate")), {
        target: { value: "http://{{ @ }}/index.html" },
      });
    });

    test("Changes text template", (done) => {
      mount(
        {
          name: "a",
          linkTextTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Link.TextTemplate")), {
        target: { value: "Text of {{ @ }}" },
      });
    });

    test("Changes title template", (done) => {
      mount(
        {
          name: "a",
          linkTitleTemplate: "{{ @ }}",
        },
        done
      );

      fireEvent.change(findInput(findByTestID("Table.ColumnEditor.Link.TitleTemplate")), {
        target: { value: "Title of {{ @ }}" },
      });
    });

    test("Makes link open in new tab ", (done) => {
      mount(
        {
          name: "a",
          linkOpenInNewTab: false,
        },
        done
      );

      setChecked(findInput(findByTestID("Table.ColumnEditor.Link.OpenInNewTab")), true);
    });
  });
});
