import React from "react";
import { render, fireEvent, act } from "@testing-library/react";

import { SortableContainer, SortableElement, DragHandle, sortableElement } from "./index";

const ITEM_HEIGHT = 40;

// jsdom doesn't lay anything out: stack sortable elements vertically, and give everything
// inside an element that element's rect
function mockLayout() {
  const original = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const item = (this as HTMLElement).closest(".sortable-element") as HTMLElement | null;
    const top = item ? Array.from(item.parentElement!.children).indexOf(item) * ITEM_HEIGHT : 0;
    const height = item ? ITEM_HEIGHT : 400;
    return { top, left: 0, right: 200, bottom: top + height, width: 200, height, x: 0, y: top, toJSON() {} } as DOMRect;
  };
  return () => {
    window.HTMLElement.prototype.getBoundingClientRect = original;
  };
}

function drag(handle: Element, deltaY: number) {
  fireEvent.mouseDown(handle, { button: 0, clientX: 10, clientY: 10 });
  act(() => {
    fireEvent.mouseMove(document, { clientX: 10, clientY: 10 + deltaY / 2 });
  });
  act(() => {
    fireEvent.mouseMove(document, { clientX: 10, clientY: 10 + deltaY });
  });
  act(() => {
    fireEvent.mouseUp(document, { clientX: 10, clientY: 10 + deltaY });
  });
}

const SortableRow = sortableElement(({ label, ...props }: any) => (
  <div {...props}>
    <DragHandle data-test={`Handle.${label}`} />
    {label}
  </div>
));

describe("Sortable", () => {
  let restoreLayout: () => void;

  beforeEach(() => {
    restoreLayout = mockLayout();
  });

  afterEach(() => {
    restoreLayout();
  });

  test("reports the old and new index when an item is dragged", () => {
    const onSortEnd = jest.fn();
    const { container } = render(
      <SortableContainer itemCount={3} onSortEnd={onSortEnd} helperClass="dragged">
        {["a", "b", "c"].map((label, index) => (
          <SortableElement key={label} index={index}>
            <div className="row">
              <DragHandle data-test={`Handle.${label}`} />
              {label}
            </div>
          </SortableElement>
        ))}
      </SortableContainer>
    );

    drag(container.querySelector('[data-test="Handle.a"]')!, 2 * ITEM_HEIGHT);

    expect(onSortEnd).toHaveBeenCalledWith({ oldIndex: 0, newIndex: 2 });
  });

  test("works with components wrapped with sortableElement", () => {
    const onSortEnd = jest.fn();
    const { container } = render(
      <SortableContainer itemCount={3} lockAxis="y" onSortEnd={onSortEnd}>
        {["a", "b", "c"].map((label, index) => (
          <SortableRow key={label} index={index} label={label} className="row" />
        ))}
      </SortableContainer>
    );

    expect(container.querySelectorAll(".row.sortable-element")).toHaveLength(3);

    drag(container.querySelector('[data-test="Handle.c"]')!, -ITEM_HEIGHT);

    expect(onSortEnd).toHaveBeenCalledWith({ oldIndex: 2, newIndex: 1 });
  });

  test("marks the container and the dragged element while dragging", () => {
    const { container } = render(
      <SortableContainer itemCount={2} helperClass="dragged" containerProps={{ className: "list" }}>
        {["a", "b"].map((label, index) => (
          <SortableRow key={label} index={index} label={label} />
        ))}
      </SortableContainer>
    );
    const handle = container.querySelector('[data-test="Handle.a"]')!;

    fireEvent.mouseDown(handle, { button: 0, clientX: 10, clientY: 10 });
    act(() => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    expect(container.querySelector(".list")!.classList).toContain("sortable-container-dragging");
    expect(container.querySelector(".dragged .drag-handle")).toBe(handle);

    act(() => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });

    expect(container.querySelector(".list")!.classList).not.toContain("sortable-container-dragging");
    expect(container.querySelector(".dragged")).toBeNull();
  });

  test("can be sorted with the keyboard", () => {
    const onSortEnd = jest.fn();
    const { container } = render(
      <SortableContainer itemCount={3} onSortEnd={onSortEnd}>
        {["a", "b", "c"].map((label, index) => (
          <SortableRow key={label} index={index} label={label} />
        ))}
      </SortableContainer>
    );
    const handle = container.querySelector('[data-test="Handle.a"]') as HTMLElement;

    // the keyboard sensor starts and moves on timers
    const press = (target: Element | Document, code: string) =>
      act(() => {
        fireEvent.keyDown(target, { code });
        jest.advanceTimersByTime(100);
      });

    handle.focus();
    press(handle, "Space");
    press(document, "ArrowDown");
    press(document, "Space");

    expect(onSortEnd).toHaveBeenCalledWith({ oldIndex: 0, newIndex: 1 });
  });

  test("does nothing when disabled", () => {
    const onSortEnd = jest.fn();
    const { container } = render(
      <SortableContainer disabled itemCount={2} onSortEnd={onSortEnd} containerProps={{ className: "list" }}>
        <div>a</div>
        <div>b</div>
      </SortableContainer>
    );

    expect(container.querySelector(".list")!.classList).not.toContain("sortable-container");
    expect(onSortEnd).not.toHaveBeenCalled();
  });

  test("renders sortable elements while disabled, and can be enabled later", () => {
    const onSortEnd = jest.fn();
    const list = (disabled: boolean) => (
      <SortableContainer disabled={disabled} itemCount={2} onSortEnd={onSortEnd} containerProps={{ className: "list" }}>
        {["a", "b"].map((label, index) => (
          <SortableElement key={label} index={index}>
            <div className="row">
              {!disabled && <DragHandle data-test={`Handle.${label}`} />}
              {label}
            </div>
          </SortableElement>
        ))}
      </SortableContainer>
    );
    const { container, rerender } = render(list(true));

    expect(container.querySelectorAll(".row")).toHaveLength(2);
    expect(container.querySelector(".drag-handle")).toBeNull();

    rerender(list(false));
    drag(container.querySelector('[data-test="Handle.a"]')!, ITEM_HEIGHT);

    expect(onSortEnd).toHaveBeenCalledWith({ oldIndex: 0, newIndex: 1 });
  });
});
