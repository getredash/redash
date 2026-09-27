import React from "react";
import { render, fireEvent } from "@testing-library/react";

import ColumnEditor from "./ColumnEditor";
import { findByTestID, findInput, openSelect, elementExists } from "@/testUtils";

function mount(column: any, variant: "table" | "details", onChange: any = jest.fn()) {
  return render(<ColumnEditor column={column} variant={variant} onChange={onChange} />);
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
    test.each(["table", "details"] as const)("Changes column title - %s variant", async (variant) => {
      return new Promise<void>((resolve) => {
        const onChange = jest.fn((changes) => {
          expect(changes).toEqual({
            ...mockColumn,
            title: "User ID",
          });
          resolve();
        });
        mount(mockColumn, variant, onChange);

        const testPrefix = variant === "table" ? "Table" : "Details";
        fireEvent.change(findInput(findByTestID(`${testPrefix}.Column.user_id.Title`)), {
          target: { value: "User ID" },
        });
      });
    });

    test.each(["table", "details"] as const)("Changes column alignment - %s variant", (variant) => {
      const onChange = jest.fn();
      mount(
        {
          ...mockColumn,
          name: "amount",
          displayAs: "number",
        },
        variant,
        onChange
      );

      const testPrefix = variant === "table" ? "Table" : "Details";
      fireEvent.click(findByTestID(`${testPrefix}.Column.amount.TextAlignment`).querySelector('input[value="right"]'));

      expect(onChange).toHaveBeenCalledWith({
        ...mockColumn,
        name: "amount",
        displayAs: "number",
        alignContent: "right",
      });
    });

    test.each(["table", "details"] as const)("Changes column description - %s variant", async (variant) => {
      return new Promise<void>((resolve) => {
        const onChange = jest.fn((changes) => {
          expect(changes).toEqual({
            ...mockColumn,
            name: "status",
            title: "Status",
            description: "Current order status",
          });
          resolve();
        });
        mount(
          {
            ...mockColumn,
            name: "status",
            title: "Status",
          },
          variant,
          onChange
        );

        const testPrefix = variant === "table" ? "Table" : "Details";
        fireEvent.change(findInput(findByTestID(`${testPrefix}.Column.status.Description`)), {
          target: { value: "Current order status" },
        });
      });
    });

    test.each(["table", "details"] as const)("Changes display type - %s variant", (variant) => {
      const onChange = jest.fn();
      mount(
        {
          ...mockColumn,
          name: "created_at",
          title: "Created At",
          displayAs: "datetime",
        },
        variant,
        onChange
      );

      const testPrefix = variant === "table" ? "Table" : "Details";
      openSelect(`${testPrefix}.Column.created_at.DisplayAs`);
      fireEvent.click(findByTestID(`${testPrefix}.Column.created_at.DisplayAs.string`));

      expect(onChange).toHaveBeenCalledWith({
        ...mockColumn,
        name: "created_at",
        title: "Created At",
        displayAs: "string",
      });
    });
  });

  describe("Table variant specific", () => {
    test("Shows search checkbox", () => {
      mount(mockColumn, "table");

      const searchCheckbox = findByTestID("Table.Column.user_id.UseForSearch");
      expect(findInput(searchCheckbox, "input[type='checkbox']")).not.toBeNull();
    });

    test("Changes search setting", () => {
      const onChange = jest.fn();
      mount(
        {
          ...mockColumn,
          allowSearch: false,
        },
        "table",
        onChange
      );

      fireEvent.click(findInput(findByTestID("Table.Column.user_id.UseForSearch"), "input[type='checkbox']"));

      expect(onChange).toHaveBeenCalledWith({
        ...mockColumn,
        allowSearch: true,
      });
    });

    test("Uses correct CSS class", () => {
      const { container } = mount(mockColumn, "table");
      expect(container.querySelectorAll(".table-visualization-editor-column")).toHaveLength(1);
    });
  });

  describe("Details variant specific", () => {
    test("Hides search checkbox", () => {
      mount(mockColumn, "details");

      expect(elementExists("Details.Column.user_id.UseForSearch")).toBe(false);
    });

    test("Uses correct CSS class", () => {
      const { container } = mount(mockColumn, "details");
      expect(container.querySelectorAll(".details-visualization-editor-column")).toHaveLength(1);
    });
  });

  describe("Props and defaults", () => {
    test("Uses default showSearch based on variant", () => {
      mount(mockColumn, "table");
      mount(mockColumn, "details");

      expect(findInput(findByTestID("Table.Column.user_id.UseForSearch"), "input[type='checkbox']")).not.toBeNull();
      expect(elementExists("Details.Column.user_id.UseForSearch")).toBe(false);
    });

    test("Allows custom testPrefix", () => {
      const onChange = jest.fn();
      const { rerender } = mount(mockColumn, "table", onChange);
      rerender(<ColumnEditor column={mockColumn} variant="table" onChange={onChange} testPrefix="Custom.Prefix" />);

      expect(findInput(findByTestID("Custom.Prefix.Title"))).not.toBeNull();
    });

    test("Handles missing onChange gracefully", () => {
      mount(mockColumn, "table", undefined);

      expect(() => {
        fireEvent.change(findInput(findByTestID("Table.Column.user_id.Title")), { target: { value: "New Title" } });
      }).not.toThrow();
    });
  });

  describe("Rendering", () => {
    test("Table variant renders with correct structure", () => {
      const { container } = mount(
        {
          ...mockColumn,
          allowSearch: true,
          description: "Sample description",
        },
        "table"
      );

      // Verify key elements are present
      expect(container.querySelectorAll(".table-visualization-editor-column")).toHaveLength(1);
      expect(findInput(findByTestID("Table.Column.user_id.Title"))).not.toBeNull();
      expect(findByTestID("Table.Column.user_id.TextAlignment").querySelectorAll("input[type='radio']")).toHaveLength(
        3
      );
      expect(findInput(findByTestID("Table.Column.user_id.UseForSearch"), "input[type='checkbox']")).not.toBeNull();
      expect(findInput(findByTestID("Table.Column.user_id.Description"))).not.toBeNull();
      expect(elementExists("Table.Column.user_id.DisplayAs")).toBe(true);
    });

    test("Details variant renders with correct structure", () => {
      const { container } = mount(
        {
          ...mockColumn,
          description: "Sample description",
        },
        "details"
      );

      // Verify key elements are present
      expect(container.querySelectorAll(".details-visualization-editor-column")).toHaveLength(1);
      expect(findInput(findByTestID("Details.Column.user_id.Title"))).not.toBeNull();
      expect(findByTestID("Details.Column.user_id.TextAlignment").querySelectorAll("input[type='radio']")).toHaveLength(
        3
      );
      expect(elementExists("Details.Column.user_id.UseForSearch")).toBe(false);
      expect(findInput(findByTestID("Details.Column.user_id.Description"))).not.toBeNull();
      expect(elementExists("Details.Column.user_id.DisplayAs")).toBe(true);
    });
  });
});
