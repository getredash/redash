import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import getTags from "@/services/getTags";
import location from "@/services/location";
import { wrap } from "./ItemsList";
import { ItemsSource } from "./classes/ItemsSource";
import { StateStorage, UrlStateStorage } from "./classes/StateStorage";
import { SearchInput, Tags } from "./components/Sidebar";

jest.mock("@/services/auth", () => ({ clientConfig: { pageSize: 20 } }));
jest.mock("@/services/getTags", () => jest.fn());

function List({ controller }) {
  return (
    <React.Fragment>
      <Tags
        url="api/dashboards/tags"
        selectedTags={controller.selectedTags}
        onChange={controller.updateSelectedTags}
        showUnselectAll
      />
      <SearchInput
        label="Search list"
        value={controller.searchTerm}
        resetVersion={controller.searchInputVersion}
        onChange={(value) => controller.updateSearch(value, { isServerSideFTS: true })}
      />
      <button type="button" onClick={() => controller.updatePagination({ page: 3 })}>
        Next page
      </button>
      <button type="button" onClick={() => controller.setSorting("name", false)}>
        Sort by name
      </button>
      <ul aria-label="Results">
        {controller.pageItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </React.Fragment>
  );
}

describe("list tag URLs", () => {
  let view;
  let request;

  beforeEach(() => {
    location.update("/dashboards", true);
    getTags.mockResolvedValue([
      { name: "Sales Reports", count: 50 },
      { name: "sales reports", count: 50 },
      { name: "R&D + QA, Europe", count: 50 },
    ]);
    request = jest.fn().mockResolvedValue({ count: 100, results: [] });
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function settle() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  function selectedTags() {
    return screen
      .getAllByRole("menuitem")
      .filter((item) => item.classList.contains("ant-menu-item-selected"))
      .map((item) => item.querySelector(".max-character").textContent);
  }

  async function open(path, createStateStorage = () => new UrlStateStorage({ orderByReverse: true })) {
    location.update(path, true);
    const Page = wrap(List, () => new ItemsSource({ doRequest: request }), createStateStorage);
    await act(async () => {
      view = render(<Page />);
    });
  }

  async function click(text, shiftKey = false) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: (name) => name.includes(text) }), { shiftKey });
    });
  }

  async function search(text) {
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "Search list" }), { target: { value: text } });
      await jest.advanceTimersByTimeAsync(200);
    });
  }

  async function navigateHistory(direction) {
    await act(async () => {
      const navigated = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
      window.history[direction]();
      await jest.advanceTimersByTimeAsync(1);
      await navigated;
    });
  }

  it.each([
    "/dashboards",
    "/dashboards/my",
    "/dashboards/favorites",
    "/queries",
    "/queries/my",
    "/queries/favorites",
    "/queries/archive",
  ])("restores tags before the first request on %s", async (path) => {
    await open(`${path}?tags=Sales+Reports&tags=R%26D%20%2B%20QA%2C%20Europe`);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({ tags: ["Sales Reports", "R&D + QA, Europe"], page: 1 });
    expect(selectedTags()).toEqual(["Sales Reports", "R&D + QA, Europe"]);
  });

  it("updates the URL while preserving search, sorting, page size and unrelated parameters", async () => {
    await open("/dashboards?order=name&page=3&page_size=10&q=sales&view=compact#results");
    await click("Sales Reports");

    expect(location.search).toMatchObject({
      tags: "Sales Reports",
      order: "name",
      page: "1",
      page_size: "10",
      q: "sales",
      view: "compact",
    });
    expect(location.hash).toBe("results");
    expect(window.location.search).toContain("tags=Sales%20Reports");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toMatchObject({ tags: ["Sales Reports"], page: 1 });
  });

  it("preserves multiple tags when paginating and sorting, then removes the parameter on clear", async () => {
    await open("/dashboards?tags=Sales%20Reports");
    await click("R&D + QA, Europe", true);
    expect(location.search.tags).toEqual(["Sales Reports", "R&D + QA, Europe"]);

    await click("Next page");
    expect(location.search.page).toBe("3");
    await click("Sort by name");
    expect(request.mock.calls[3][0]).toMatchObject({ tags: ["Sales Reports", "R&D + QA, Europe"], order: "name" });

    await click("clear selection");
    expect(location.search.tags).toBeUndefined();
    expect(location.search.page).toBe("1");
    expect(selectedTags()).toEqual([]);
    expect(request.mock.calls[4][0].tags).toEqual([]);
    expect(request).toHaveBeenCalledTimes(5);
  });

  it("toggles a restored tag and retains the other selected tags on shift-click", async () => {
    await open("/dashboards?tags=Sales%20Reports&tags=sales%20reports");
    await click("Sales Reports", true);
    expect(location.search.tags).toBe("sales reports");
    await click("sales reports");
    expect(location.search.tags).toBeUndefined();
    expect(request.mock.calls[2][0].tags).toEqual([]);
  });

  it("preserves exact tag names and ignores empty, bare and duplicate parameters", async () => {
    await open(
      "/dashboards?tags&tags=&tags=Sales%20Reports&tags=Sales%20Reports&tags=sales%20reports&tags=%E6%97%A5%E6%9C%AC%E8%AA%9E"
    );
    expect(request.mock.calls[0][0].tags).toEqual(["Sales Reports", "sales reports", "日本語"]);
  });

  it("restores a replaced URL on the same page without duplicate requests", async () => {
    await open("/dashboards?tags=Sales%20Reports");
    act(() => location.update("/dashboards?tags=sales%20reports&page=2", true));
    await settle();

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toMatchObject({ tags: ["sales reports"], page: 2 });
    expect(selectedTags()).toEqual(["sales reports"]);
  });

  it("restores tags on browser back and forward without remounting", async () => {
    await open("/dashboards?tags=Sales%20Reports");
    act(() => location.update("/dashboards?tags=sales%20reports"));
    await settle();

    for (const [direction, tag] of [
      ["back", "Sales Reports"],
      ["forward", "sales reports"],
    ]) {
      await act(async () => {
        const navigated = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
        window.history[direction]();
        await navigated;
      });
      await settle();
      expect(selectedTags()).toEqual([tag]);
      expect(request.mock.calls[request.mock.calls.length - 1][0].tags).toEqual([tag]);
    }
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("restores search-only navigation along with the tags", async () => {
    await open("/queries?tags=Sales%20Reports");
    act(() => location.update("/queries?q=revenue&tags=sales%20reports"));
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toMatchObject({ q: "revenue", tags: ["sales reports"], order: null });
  });

  it("keeps tags when searching and restores the previous sort when search is cleared", async () => {
    await open("/queries?tags=Sales%20Reports");
    jest.useFakeTimers();

    for (const [searchTerm, order] of [
      ["revenue", null],
      ["", "-created_at"],
    ]) {
      await act(async () => {
        fireEvent.change(screen.getByRole("textbox", { name: "Search list" }), { target: { value: searchTerm } });
        jest.advanceTimersByTime(200);
      });
      expect(request.mock.calls[request.mock.calls.length - 1][0]).toMatchObject({
        tags: ["Sales Reports"],
        q: searchTerm || undefined,
        order,
      });
      expect(location.search.tags).toBe("Sales Reports");
    }
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not refetch for unrelated URL parameters or hash changes", async () => {
    await open("/dashboards?tags=Sales%20Reports");
    act(() => location.setSearch({ view: "compact" }, true));
    act(() => location.setHash("results", true));
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["/queries", "back", ""],
    ["/queries", "forward", ""],
    ["/dashboards", "back", ""],
    ["/dashboards", "forward", ""],
    ["/queries", "back", "revenue"],
    ["/queries", "forward", "revenue"],
    ["/dashboards", "back", "revenue"],
    ["/dashboards", "forward", "revenue"],
  ])("cancels a delayed search on %s browser %s with unchanged q=%j", async (path, direction, searchTerm) => {
    await open(`${path}?q=${searchTerm}&tags=Sales%20Reports&page=2`);
    act(() => location.update(`${path}?q=${searchTerm}&tags=sales%20reports&page=3`));
    await settle();
    jest.useFakeTimers();
    if (direction === "forward") {
      await navigateHistory("back");
    }

    const input = screen.getByRole("textbox", { name: "Search list" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "stale search" } });
    expect(input.value).toBe("stale search");
    await navigateHistory(direction);
    expect(screen.getByRole("textbox", { name: "Search list" })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe(searchTerm);
    const restoredUrl = location.url;
    const requestCount = request.mock.calls.length;
    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(location.url).toBe(restoredUrl);
    expect(request).toHaveBeenCalledTimes(requestCount);
    expect(request.mock.calls[requestCount - 1][0]).toMatchObject({
      q: searchTerm || undefined,
      tags: [direction === "back" ? "Sales Reports" : "sales reports"],
      page: direction === "back" ? 2 : 3,
    });
    expect(input.value).toBe(searchTerm);
  });

  it("discards a queued search and a stale response after browser navigation", async () => {
    request.mockResolvedValue({ count: 100, results: [{ id: 1, name: "Current results" }] });
    await open("/queries?tags=Sales%20Reports&page=2");
    act(() => location.update("/queries?tags=sales%20reports&page=3"));
    await settle();
    jest.useFakeTimers();

    let finishSearch;
    request.mockImplementationOnce(() => new Promise((resolve) => (finishSearch = resolve)));
    await search("running search");
    await search("queued search");
    expect(request).toHaveBeenCalledTimes(3);

    await navigateHistory("back");
    const restoredUrl = location.url;
    await act(async () => {
      finishSearch({ count: 1, results: [{ id: 2, name: "Stale results" }] });
      await jest.advanceTimersByTimeAsync(500);
    });

    expect(location.url).toBe(restoredUrl);
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls[3][0]).toMatchObject({ q: undefined, tags: ["Sales Reports"], page: 2 });
    expect(screen.getByRole("list", { name: "Results" }).textContent).toBe("Current results");
    expect(screen.getByRole("textbox", { name: "Search list" }).value).toBe("");
  });

  it.each(["delayed", "queued"])("cancels a %s search when the list unmounts", async (kind) => {
    await open("/queries?tags=Sales%20Reports");
    jest.useFakeTimers();
    let finishSearch;
    if (kind === "queued") {
      request.mockImplementationOnce(() => new Promise((resolve) => (finishSearch = resolve)));
      await search("running search");
      await search("queued search");
    } else {
      fireEvent.change(screen.getByRole("textbox", { name: "Search list" }), { target: { value: "delayed search" } });
    }
    const requestCount = request.mock.calls.length;
    view.unmount();
    view = null;
    location.update("/dashboards?tags=sales%20reports");
    const nextUrl = location.url;
    await act(async () => {
      finishSearch?.({ count: 100, results: [] });
      await jest.advanceTimersByTimeAsync(500);
    });

    expect(request).toHaveBeenCalledTimes(requestCount);
    expect(location.url).toBe(nextUrl);
  });

  it("ignores unrelated URL changes during search and preserves the previous descending sort", async () => {
    await open("/queries?tags=Sales%20Reports");
    jest.useFakeTimers();
    await search("revenue");
    expect(request).toHaveBeenCalledTimes(2);

    act(() => location.setSearch({ view: "compact" }, true));
    act(() => location.setHash("results", true));
    await settle();
    expect(request).toHaveBeenCalledTimes(2);

    await search("");
    expect(request.mock.calls[2][0]).toMatchObject({ q: undefined, tags: ["Sales Reports"], order: "-created_at" });
  });

  it.each(["-created_at", "-name", "name"])(
    "preserves %s when restoring a search URL without an order",
    async (order) => {
      await open(`/queries?order=${order}&tags=Sales%20Reports`);
      jest.useFakeTimers();
      await search("revenue");
      act(() => location.update("/queries?q=revenue&tags=sales%20reports&page=2"));
      await settle();
      expect(request.mock.calls[2][0]).toMatchObject({ q: "revenue", tags: ["sales reports"], page: 2, order: null });

      await search("");
      expect(request.mock.calls[3][0]).toMatchObject({ q: undefined, tags: ["sales reports"], page: 1, order });
      expect(location.search.order).toBe(order);
    }
  );

  it("keeps a pending search when only unrelated URL parameters change", async () => {
    await open("/queries?tags=Sales%20Reports");
    jest.useFakeTimers();
    await search("revenue");
    fireEvent.change(screen.getByRole("textbox", { name: "Search list" }), { target: { value: "forecast" } });
    act(() => location.setSearch({ view: "compact" }, true));
    act(() => location.setHash("results", true));
    expect(screen.getByRole("textbox", { name: "Search list" }).value).toBe("forecast");
    await act(async () => jest.advanceTimersByTimeAsync(200));

    expect(request).toHaveBeenCalledTimes(3);
    expect(location.search.q).toBe("forecast");
    expect(location.hash).toBe("results");
    expect(screen.getByRole("textbox", { name: "Search list" }).value).toBe("forecast");
  });

  it("ignores other routes and stops listening after unmount", async () => {
    await open("/dashboards?tags=Sales%20Reports");
    act(() => location.update("/queries?tags=sales%20reports"));
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    view.unmount();
    view = null;
    location.update("/dashboards?tags=sales%20reports", true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps lists with in-memory state independent of the URL", async () => {
    await open("/alerts?tags=Sales%20Reports", () => new StateStorage());
    expect(request.mock.calls[0][0].tags).toEqual([]);
    act(() => location.update("/alerts?tags=sales%20reports", true));
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
