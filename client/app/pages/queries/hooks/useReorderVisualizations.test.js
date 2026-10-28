import React from "react";
import { mount } from "enzyme";
import { Query } from "@/services/query";
import Visualization from "@/services/visualization";
import notification from "@/services/notification";
import useReorderVisualizations from "./useReorderVisualizations";

jest.mock("@/services/visualization", () => ({ reorder: jest.fn() }));
jest.mock("@/services/notification", () => ({ error: jest.fn(), success: jest.fn() }));

let reorderVisualizations;
function Harness({ query, onChange }) {
  reorderVisualizations = useReorderVisualizations(query, onChange);
  return null;
}

const visualization = (id, position) => ({ id, name: `V${id}`, position, type: "TABLE", options: {} });

function setup() {
  let query = new Query({ id: 1, options: {}, visualizations: [1, 2, 3].map((id) => visualization(id, id - 1)) });
  // Mimics React's setState: onChange may receive either the next value, or an updater
  // function that computes it from the current value (as the real setQuery supports).
  const onChange = (updatedOrUpdater) => {
    query = typeof updatedOrUpdater === "function" ? updatedOrUpdater(query) : updatedOrUpdater;
  };
  mount(<Harness query={query} onChange={onChange} />);
  return { ids: () => query.visualizations.map((v) => v.id) };
}

describe("useReorderVisualizations", () => {
  beforeEach(() => {
    Visualization.reorder.mockReset();
    notification.error.mockReset();
  });

  test("moves the tabs before the request resolves", () => {
    const { ids } = setup();
    Visualization.reorder.mockReturnValueOnce(new Promise(() => {}));
    reorderVisualizations([3, 1, 2]);
    expect(ids()).toEqual([3, 1, 2]);
    expect(Visualization.reorder).toHaveBeenCalledWith({ queryId: 1, ids: [3, 1, 2] });
  });

  test("rolls back when its own request fails", async () => {
    const { ids } = setup();
    Visualization.reorder.mockReturnValueOnce(Promise.reject(new Error("nope")));
    await reorderVisualizations([3, 1, 2]);
    expect(ids()).toEqual([1, 2, 3]);
    expect(notification.error).toHaveBeenCalled();
  });

  test("a late failure from a superseded reorder doesn't roll back a newer one", async () => {
    const { ids } = setup();

    let rejectFirst;
    Visualization.reorder.mockReturnValueOnce(new Promise((_resolve, reject) => (rejectFirst = reject)));
    reorderVisualizations([3, 1, 2]);
    expect(ids()).toEqual([3, 1, 2]);

    Visualization.reorder.mockReturnValueOnce(new Promise(() => {}));
    reorderVisualizations([2, 3, 1]);
    expect(ids()).toEqual([2, 3, 1]);

    rejectFirst(new Error("nope"));
    await Promise.resolve();
    await Promise.resolve();

    expect(ids()).toEqual([2, 3, 1]);
    expect(notification.error).not.toHaveBeenCalled();
  });
});
