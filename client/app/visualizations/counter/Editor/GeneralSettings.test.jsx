import { after } from "lodash";
import React from "react";
import enzyme from "enzyme";

import getOptions from "../getOptions";
import GeneralSettings from "./GeneralSettings";

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
    <GeneralSettings
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

describe("Visualizations -> Counter -> Editor -> General Settings", () => {
  test("Changes Counter Label", done => {
    const el = mount({}, done);

    findByTestID(el, "Counter.CounterLabel")
      .last()
      .find("input")
      .simulate("change", { target: { value: "Custom Counter Label" } });
  });

  test("Changes Number Format", done => {
    // we will perform 3 actions, so call `done` after all of them completed
    const el = mount({}, after(3, done));

    findByTestID(el, "Counter.NumberFormat")
      .last()
      .find("input")
      .simulate("change", { target: { value: "0,0.0000" } });

    findByTestID(el, "Counter.DecimalCharacter")
      .last()
      .find("input")
      .simulate("change", { target: { value: "-" } });

    findByTestID(el, "Counter.ThousandsSeparator")
      .last()
      .find("input")
      .simulate("change", { target: { value: "/" } });
  });
});
