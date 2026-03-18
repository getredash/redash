import { after } from "lodash";
import React from "react";
import { render, fireEvent } from "@testing-library/react";

import getOptions from "../getOptions";
import ColorsSettings from "./ColorsSettings";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

function openSelect(testId: string) {
  const el = findByTestID(testId).pop()!;
  const selector = el.querySelector(".ant-select-selector") || el;
  fireEvent.mouseDown(selector);
}

function clickOption(testId: string) {
  const el = findByTestID(testId).pop();
  if (el) fireEvent.click(el);
}

function mount(options: any, done: any) {
  options = getOptions(options);
  const { container } = render(
    <ColorsSettings
      visualizationName="Test"
      data={{
        columns: [
          { name: "a", type: "string" },
          { name: "b", type: "number" },
        ],
        rows: [{ a: "v", b: 3.14 }],
      }}
      options={options}
      onOptionsChange={(changedOptions: any) => {
        expect(changedOptions).toMatchSnapshot();
        done();
      }}
    />
  );
  return container;
}

describe("Visualizations -> Chart -> Editor -> Colors Settings", () => {
  describe("for pie", () => {
    test("Changes series color", (done) => {
      const el = mount(
        {
          globalSeriesType: "pie",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      // ColorPicker doesn't render data-test to DOM, use table row key instead
      const trigger = document.body.querySelector('[data-row-key="v"] .color-picker-trigger') as HTMLElement;
      fireEvent.click(trigger);
      fireEvent.change(getInput(findByTestID("ColorPicker").pop()!), { target: { value: "red" } });
    });
  });

  describe("for heatmap", () => {
    test("Changes color scheme", (done) => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      openSelect("Chart.Colors.Heatmap.ColorScheme");
      clickOption("Chart.Colors.Heatmap.ColorScheme.Blues");
    });

    test("Sets custom color scheme", (done) => {
      const el = mount(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
          colorScheme: "Custom...",
        },
        after(2, done)
      ); // we will perform 2 actions, so call `done` after all of them completed

      // ColorPicker doesn't render data-test to DOM, find by MinColor/MaxColor wrapper
      const colorPickers = document.body.querySelectorAll(".color-picker-trigger");
      // MinColor picker is first, MaxColor is second
      fireEvent.click(colorPickers[0]);
      fireEvent.change(getInput(findByTestID("ColorPicker").pop()!), { target: { value: "yellow" } });

      fireEvent.click(colorPickers[1]);
      fireEvent.change(getInput(findByTestID("ColorPicker").pop()!), { target: { value: "red" } });
    });
  });

  describe("for all except of pie and heatmap", () => {
    test("Changes series color", (done) => {
      const el = mount(
        {
          globalSeriesType: "column",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      // ColorPicker doesn't render data-test to DOM, use table row key instead
      const trigger = document.body.querySelector('[data-row-key="b"] .color-picker-trigger') as HTMLElement;
      fireEvent.click(trigger);

      fireEvent.change(getInput(findByTestID("ColorPicker").pop()!), { target: { value: "red" } });
    });
  });
});
