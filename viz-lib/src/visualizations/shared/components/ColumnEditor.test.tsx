import React from "react";
import enzyme from "enzyme";

import ColumnEditor from "./ColumnEditor";

function findByTestID(wrapper: any, testId: any) {
  return wrapper.find(`[data-test="${testId}"]`);
}

function mount(column: any, variant: "table" | "details", onChange: any = jest.fn()) {
  return enzyme.mount(
    <ColumnEditor
      column={column}
      variant={variant}
      onChange={onChange}
    />
  );
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
        const el = mount(mockColumn, variant, onChange);

        const testPrefix = variant === "table" ? "Table" : "Details";
        findByTestID(el, `${testPrefix}.Column.user_id.Title`)
          .find("input")
          .simulate("change", { target: { value: "User ID" } });
      });
    });

    test.each(["table", "details"] as const)("Changes column alignment - %s variant", (variant) => {
      const onChange = jest.fn();
      const el = mount({
        ...mockColumn,
        name: "amount",
        displayAs: "number",
      }, variant, onChange);

      const testPrefix = variant === "table" ? "Table" : "Details";
      findByTestID(el, `${testPrefix}.Column.amount.TextAlignment`)
        .find('input[value="right"]')
        .simulate("change", { target: { value: "right" } });

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
        const el = mount({
          ...mockColumn,
          name: "status",
          title: "Status",
        }, variant, onChange);

        const testPrefix = variant === "table" ? "Table" : "Details";
        findByTestID(el, `${testPrefix}.Column.status.Description`)
          .find("input")
          .simulate("change", { target: { value: "Current order status" } });
      });
    });

    test.each(["table", "details"] as const)("Changes display type - %s variant", (variant) => {
      const onChange = jest.fn();
      const el = mount({
        ...mockColumn,
        name: "created_at",
        title: "Created At",
        displayAs: "datetime",
      }, variant, onChange);

      const testPrefix = variant === "table" ? "Table" : "Details";
      findByTestID(el, `${testPrefix}.Column.created_at.DisplayAs`)
        .find(".ant-select-selector")
        .simulate("mouseDown");
      findByTestID(el, `${testPrefix}.Column.created_at.DisplayAs.string`)
        .simulate("click");

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
      const el = mount(mockColumn, "table");

      const searchCheckbox = findByTestID(el, "Table.Column.user_id.UseForSearch");
      expect(searchCheckbox.find("input[type='checkbox']")).toHaveLength(1);
    });

    test("Changes search setting", () => {
      const onChange = jest.fn();
      const el = mount({
        ...mockColumn,
        allowSearch: false,
      }, "table", onChange);

      findByTestID(el, "Table.Column.user_id.UseForSearch")
        .find("input[type='checkbox']")
        .simulate("change", { target: { checked: true } });

      expect(onChange).toHaveBeenCalledWith({
        ...mockColumn,
        allowSearch: true,
      });
    });

    test("Uses correct CSS class", () => {
      const el = mount(mockColumn, "table");
      expect(el.find(".table-visualization-editor-column")).toHaveLength(1);
    });
  });

  describe("Details variant specific", () => {
    test("Hides search checkbox", () => {
      const el = mount(mockColumn, "details");

      const searchCheckbox = findByTestID(el, "Details.Column.user_id.UseForSearch");
      expect(searchCheckbox).toHaveLength(0);
    });

    test("Uses correct CSS class", () => {
      const el = mount(mockColumn, "details");
      expect(el.find(".details-visualization-editor-column")).toHaveLength(1);
    });
  });

  describe("Props and defaults", () => {
    test("Uses default showSearch based on variant", () => {
      const tableEl = mount(mockColumn, "table");
      const detailsEl = mount(mockColumn, "details");

      expect(findByTestID(tableEl, "Table.Column.user_id.UseForSearch").find("input[type='checkbox']")).toHaveLength(1);
      expect(findByTestID(detailsEl, "Details.Column.user_id.UseForSearch")).toHaveLength(0);
    });

    test("Allows custom testPrefix", () => {
      const el = mount(mockColumn, "table");
      el.setProps({ testPrefix: "Custom.Prefix" });
      el.update();

      expect(findByTestID(el, "Custom.Prefix.Title").find("input")).toHaveLength(1);
    });

    test("Handles missing onChange gracefully", () => {
      const el = mount(mockColumn, "table", undefined);

      expect(() => {
        findByTestID(el, "Table.Column.user_id.Title")
          .find("input")
          .simulate("change", { target: { value: "New Title" } });
      }).not.toThrow();
    });
  });

  describe("Rendering", () => {
    test("Table variant renders with correct structure", () => {
      const el = mount({
        ...mockColumn,
        allowSearch: true,
        description: "Sample description",
      }, "table");

      // Verify key elements are present
      expect(el.find('.table-visualization-editor-column')).toHaveLength(1);
      expect(findByTestID(el, "Table.Column.user_id.Title").find("input")).toHaveLength(1);
      expect(findByTestID(el, "Table.Column.user_id.TextAlignment").find("input[type='radio']")).toHaveLength(3);
      expect(findByTestID(el, "Table.Column.user_id.UseForSearch").find("input[type='checkbox']")).toHaveLength(1);
      expect(findByTestID(el, "Table.Column.user_id.Description").find("input")).toHaveLength(1);
      expect(findByTestID(el, "Table.Column.user_id.DisplayAs")).toHaveLength(7); // Expected count based on current behavior
    });

    test("Details variant renders with correct structure", () => {
      const el = mount({
        ...mockColumn,
        description: "Sample description",
      }, "details");

      // Verify key elements are present
      expect(el.find('.details-visualization-editor-column')).toHaveLength(1);
      expect(findByTestID(el, "Details.Column.user_id.Title").find("input")).toHaveLength(1);
      expect(findByTestID(el, "Details.Column.user_id.TextAlignment").find("input[type='radio']")).toHaveLength(3);
      expect(findByTestID(el, "Details.Column.user_id.UseForSearch")).toHaveLength(0); // Should not exist
      expect(findByTestID(el, "Details.Column.user_id.Description").find("input")).toHaveLength(1);
      expect(findByTestID(el, "Details.Column.user_id.DisplayAs")).toHaveLength(7); // Expected count based on current behavior
    });
  });
});
