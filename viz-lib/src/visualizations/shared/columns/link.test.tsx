import React from "react";
import enzyme from "enzyme";

import Column from "./link";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(column: any, done: any) {
  return enzyme.mount(
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

      findByTestID(el, "Table.ColumnEditor.Link.UrlTemplate")
        .last()
        .find("input")
        .simulate("change", { target: { value: "http://{{ @ }}/index.html" } });
    });

    test("Changes text template", done => {
      const el = mount(
        {
          name: "a",
          linkTextTemplate: "{{ @ }}",
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Link.TextTemplate")
        .last()
        .find("input")
        .simulate("change", { target: { value: "Text of {{ @ }}" } });
    });

    test("Changes title template", done => {
      const el = mount(
        {
          name: "a",
          linkTitleTemplate: "{{ @ }}",
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Link.TitleTemplate")
        .last()
        .find("input")
        .simulate("change", { target: { value: "Title of {{ @ }}" } });
    });

    test("Makes link open in new tab ", done => {
      const el = mount(
        {
          name: "a",
          linkOpenInNewTab: false,
        },
        done
      );

      findByTestID(el, "Table.ColumnEditor.Link.OpenInNewTab")
        .last()
        .find("input")
        .simulate("change", { target: { checked: true } });
    });
  });
});
