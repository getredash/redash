import { after } from "lodash";
import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import SecondaryValueSettings from "./SecondaryValueSettings";

function findByTestID(wrapper, testId) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(options, done) {
  const data = {
    columns: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
    ],
    rows: [{ a: 123, b: 987 }],
  };

  options = getOptions(options, data);
  return enzyme.mount(
    <SecondaryValueSettings
      visualizationName="Test"
      data={data}
      options={options}
      onOptionsChange={changedOptions => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
}

describe("Visualizations -> Counter -> Editor -> Primary Value Settings", () => {
  test("Changes Counter Type", done => {
    const el = mount({ schemaVersion: 2, primaryValue: { type: "unused" } }, done);

    findByTestID(el, "Counter.CounterType")
      .last()
      .simulate("click");
    findByTestID(el, "Counter.CounterType.rowValue")
      .last()
      .simulate("click");
  });

  test("Changes Counter Type Options", done => {
    // we will perform 2 actions, so call `done` after all of them completed
    const el = mount({ schemaVersion: 2, secondaryValue: { type: "rowValue" } }, after(2, done));

    findByTestID(el, "Counter.ColumnName")
      .last()
      .simulate("click");
    findByTestID(el, "Counter.ColumnName.a")
      .last()
      .simulate("click");

    findByTestID(el, "Counter.RowNumber")
      .last()
      .find("input")
      .simulate("change", { target: { value: "3" } });
  });

  test("Changes Format Options", done => {
    // we will perform 3 actions, so call `done` after all of them completed
    const el = mount({ schemaVersion: 2, secondaryValue: { type: "rowValue" } }, after(3, done));

    findByTestID(el, "Counter.DisplayFormat")
      .last()
      .find("input")
      .simulate("change", { target: { value: "{{ @@value_formatted }} ({{ @@value }})" } });

    findByTestID(el, "Counter.ShowTooltip")
      .last()
      .find("input")
      .simulate("change", { target: { checked: false } });

    findByTestID(el, "Counter.TooltipFormat")
      .last()
      .find("input")
      .simulate("change", { target: { value: "{{ @@value_formatted }} / {{ @@value }}" } });
  });

  test("Hides Secondary Value", done => {
    const el = mount({ schemaVersion: 2, secondaryValue: { show: true, type: "rowValue" } }, done);

    findByTestID(el, "Counter.ShowSecondaryValue")
      .last()
      .find("input")
      .simulate("change", { target: { checked: false } });
  });
});
