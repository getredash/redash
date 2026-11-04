import React from "react";
import { mount } from "enzyme";
import { SortableContainerWrapper, SortableElement } from "@redash/viz/lib/components/sortable";
import QueryVisualizationTabs from "./QueryVisualizationTabs";

jest.mock("@/components/visualizations/VisualizationRenderer", () => () => null);

// jsdom has no matchMedia, which the `use-media` npm package needs to tell desktop from mobile.
window.matchMedia = (query) => ({
  media: query,
  matches: false,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

const visualizations = [
  { id: 1, name: "Table", type: "TABLE", position: 2, options: {} },
  { id: 2, name: "Chart", type: "CHART", position: 0, options: {} },
  { id: 3, name: "Cohort", type: "COHORT", position: 1, options: {} },
];

function mountTabs(props = {}) {
  return mount(
    <QueryVisualizationTabs
      visualizations={visualizations}
      queryResult={{ getData: () => [], getColumns: () => [], getStatus: () => "done" }}
      {...props}
    />
  );
}

describe("QueryVisualizationTabs", () => {
  test("renders tabs ordered by their position field, falling back to id", () => {
    const wrapper = mountTabs();
    expect(wrapper.find(".ant-tabs-tab").map((node) => node.text().trim())).toEqual(["Chart", "Cohort", "Table"]);
  });

  test("orders by id when every visualization shares the same position", () => {
    const wrapper = mountTabs({
      visualizations: [
        { id: 3, name: "Third", type: "CHART", position: 0, options: {} },
        { id: 1, name: "First", type: "TABLE", position: 0, options: {} },
        { id: 2, name: "Second", type: "CHART", position: 0, options: {} },
      ],
    });
    expect(wrapper.find(".ant-tabs-tab").map((node) => node.text().trim())).toEqual(["First", "Second", "Third"]);
  });

  test("does not make tabs sortable unless reordering is allowed", () => {
    const wrapper = mountTabs({ canReorderVisualizations: false });
    expect(wrapper.find(SortableContainerWrapper)).toHaveLength(0);
  });

  test("does not make tabs sortable when there is a single visualization", () => {
    const wrapper = mountTabs({
      canReorderVisualizations: true,
      visualizations: [visualizations[0]],
    });
    expect(wrapper.find(SortableContainerWrapper)).toHaveLength(0);
  });

  test("wraps every tab into a sortable element carrying its position", () => {
    const wrapper = mountTabs({ canReorderVisualizations: true });
    const sortableTabs = wrapper.find(SortableElement);

    expect(sortableTabs).toHaveLength(3);
    expect(sortableTabs.map((node) => node.props().index)).toEqual([0, 1, 2]);
    // tabs are ordered [Chart (2), Cohort (3), Table (1)]
    expect(sortableTabs.map((node) => node.text().trim())).toEqual(["Chart", "Cohort", "Table"]);
  });

  test("reports the new order of visualization ids when a tab is dropped", () => {
    const onReorderVisualizations = jest.fn();
    const wrapper = mountTabs({ canReorderVisualizations: true, onReorderVisualizations });

    // tabs are rendered as [2, 3, 1] - move the last one to the front
    wrapper.find(SortableContainerWrapper).first().props().onSortEnd({ oldIndex: 2, newIndex: 0 });

    expect(onReorderVisualizations).toHaveBeenCalledWith([1, 2, 3]);
  });

  test("ignores a drop that leaves the tab in place", () => {
    const onReorderVisualizations = jest.fn();
    const wrapper = mountTabs({ canReorderVisualizations: true, onReorderVisualizations });

    wrapper.find(SortableContainerWrapper).first().props().onSortEnd({ oldIndex: 1, newIndex: 1 });

    expect(onReorderVisualizations).not.toHaveBeenCalled();
  });
});
