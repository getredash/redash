import React from "react";
import enzyme from "enzyme";

import ColumnEditor from "./ColumnEditor";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(column: any, done: any) {
  return enzyme.mount(
    <ColumnEditor
      column={column}
      onChange={(changedColumn: any) => {
        expect(changedColumn).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Details -> Editor -> Column Editor", () => {
  test("Changes column title", done => {
    const el = mount(
      {
        name: "user_id",
        title: "user_id",
        visible: true,
        alignContent: "left",
        displayAs: "string",
        description: "",
      },
      done
    );

    findByTestID(el, "Details.Column.user_id.Title")
      .last()
      .simulate("change", { target: { value: "User ID" } });
  });

  test("Changes column alignment", done => {
    const el = mount(
      {
        name: "amount",
        title: "amount",
        visible: true,
        alignContent: "left",
        displayAs: "number",
        description: "",
      },
      done
    );

    findByTestID(el, "Details.Column.amount.TextAlignment")
      .last()
      .find('input[value="right"]')
      .simulate("change", { target: { value: "right" } });
  });

  test("Changes column description", done => {
    const el = mount(
      {
        name: "status",
        title: "Status",
        visible: true,
        alignContent: "left",
        displayAs: "string",
        description: "",
      },
      done
    );

    findByTestID(el, "Details.Column.status.Description")
      .last()
      .simulate("change", { target: { value: "Current order status" } });
  });

  test("Changes display type", done => {
    const el = mount(
      {
        name: "created_at",
        title: "Created At",
        visible: true,
        alignContent: "left",
        displayAs: "datetime",
        description: "",
      },
      done
    );

    findByTestID(el, "Details.Column.created_at.DisplayAs")
      .last()
      .simulate("mouseDown");
    findByTestID(el, "Details.Column.created_at.DisplayAs.string")
      .last()
      .simulate("click");
  });
});
