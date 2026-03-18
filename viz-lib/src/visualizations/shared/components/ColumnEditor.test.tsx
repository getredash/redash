import React from "react";
import { render, fireEvent, act } from "@testing-library/react";

import ColumnEditor from "./ColumnEditor";

function findByTestID(testId: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(`[data-test="${testId}"]`));
}

function getInput(el: HTMLElement): HTMLInputElement {
  return (el.tagName === "INPUT" ? el : el.querySelector("input")!) as HTMLInputElement;
}

const mockColumn = {
  name: "user_id",
  title: "user_id",
  visible: true,
  alignContent: "left" as const,
  displayAs: "string",
  description: "",
  allowSearch: false,
};

describe("Shared ColumnEditor", () => {
  describe("Common functionality", () => {
    test.each(["table", "details"] as const)("Changes column title - %s variant", (variant) => {
      jest.useFakeTimers();
      const onChange = jest.fn();
      render(<ColumnEditor column={mockColumn} variant={variant} onChange={onChange} />);

      const testPrefix = variant === "table" ? "Table" : "Details";
      const input = getInput(findByTestID(`${testPrefix}.Column.user_id.Title`).pop()!);
      fireEvent.change(input, { target: { value: "User ID" } });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      jest.useRealTimers();

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: "User ID" }));
    });

    test.each(["table", "details"] as const)("Changes column alignment - %s variant", (variant) => {
      const onChange = jest.fn();
      render(
        <ColumnEditor
          column={{ ...mockColumn, name: "amount", displayAs: "number" }}
          variant={variant}
          onChange={onChange}
        />
      );

      const radio = document.body.querySelector('[data-test="TextAlignmentSelect.Right"]') as HTMLInputElement;
      fireEvent.click(radio);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ alignContent: "right" }));
    });

    test.each(["table", "details"] as const)("Changes column description - %s variant", (variant) => {
      jest.useFakeTimers();
      const onChange = jest.fn();
      render(
        <ColumnEditor
          column={{ ...mockColumn, name: "status", title: "Status" }}
          variant={variant}
          onChange={onChange}
        />
      );

      const testPrefix = variant === "table" ? "Table" : "Details";
      const input = getInput(findByTestID(`${testPrefix}.Column.status.Description`).pop()!);
      fireEvent.change(input, { target: { value: "Current order status" } });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      jest.useRealTimers();

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ description: "Current order status" }));
    });

    test.each(["table", "details"] as const)("Changes display type - %s variant", (variant) => {
      const onChange = jest.fn();
      render(
        <ColumnEditor
          column={{ ...mockColumn, name: "created_at", title: "Created At", displayAs: "datetime" }}
          variant={variant}
          onChange={onChange}
        />
      );

      // Open the Select (only one in ColumnEditor)
      const selector = document.body.querySelector(".ant-select-selector")!;
      fireEvent.mouseDown(selector);

      const testPrefix = variant === "table" ? "Table" : "Details";
      const option = document.body.querySelector(`[data-test="${testPrefix}.Column.created_at.DisplayAs.string"]`);
      if (option) fireEvent.click(option);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ displayAs: "string" }));
    });
  });

  describe("Table variant specific", () => {
    test("Shows search checkbox", () => {
      render(<ColumnEditor column={mockColumn} variant="table" />);

      const searchEl = findByTestID("Table.Column.user_id.UseForSearch").pop()!;
      const checkbox =
        searchEl.querySelector("input[type='checkbox']") || (searchEl.tagName === "INPUT" ? searchEl : null);
      expect(checkbox).not.toBeNull();
    });

    test("Changes search setting", () => {
      const onChange = jest.fn();
      render(<ColumnEditor column={{ ...mockColumn, allowSearch: false }} variant="table" onChange={onChange} />);

      const searchEl = findByTestID("Table.Column.user_id.UseForSearch").pop()!;
      const checkbox = searchEl.querySelector("input[type='checkbox']") || searchEl;
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ allowSearch: true }));
    });

    test("Uses correct CSS class", () => {
      const { container } = render(<ColumnEditor column={mockColumn} variant="table" />);
      expect(container.querySelector(".table-visualization-editor-column")).not.toBeNull();
    });
  });

  describe("Details variant specific", () => {
    test("Hides search checkbox", () => {
      render(<ColumnEditor column={mockColumn} variant="details" />);
      expect(findByTestID("Details.Column.user_id.UseForSearch")).toHaveLength(0);
    });

    test("Uses correct CSS class", () => {
      const { container } = render(<ColumnEditor column={mockColumn} variant="details" />);
      expect(container.querySelector(".details-visualization-editor-column")).not.toBeNull();
    });
  });

  describe("Rendering", () => {
    test("Table variant renders with correct structure", () => {
      const { container } = render(
        <ColumnEditor
          column={{ ...mockColumn, allowSearch: true, description: "Sample description" }}
          variant="table"
        />
      );

      expect(container.querySelector(".table-visualization-editor-column")).not.toBeNull();
      expect(findByTestID("Table.Column.user_id.Title").length).toBeGreaterThan(0);
      expect(findByTestID("Table.Column.user_id.TextAlignment").length).toBeGreaterThan(0);
      expect(findByTestID("Table.Column.user_id.UseForSearch").length).toBeGreaterThan(0);
      expect(findByTestID("Table.Column.user_id.Description").length).toBeGreaterThan(0);
      expect(container.querySelector(".ant-select")).not.toBeNull();
    });

    test("Details variant renders with correct structure", () => {
      const { container } = render(
        <ColumnEditor column={{ ...mockColumn, description: "Sample description" }} variant="details" />
      );

      expect(container.querySelector(".details-visualization-editor-column")).not.toBeNull();
      expect(findByTestID("Details.Column.user_id.Title").length).toBeGreaterThan(0);
      expect(findByTestID("Details.Column.user_id.TextAlignment").length).toBeGreaterThan(0);
      expect(findByTestID("Details.Column.user_id.UseForSearch")).toHaveLength(0);
      expect(findByTestID("Details.Column.user_id.Description").length).toBeGreaterThan(0);
      expect(container.querySelector(".ant-select")).not.toBeNull();
    });
  });
});
