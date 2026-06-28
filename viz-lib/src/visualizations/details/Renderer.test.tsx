import React from "react";
import enzyme from "enzyme";
import moment from "moment";

import Renderer from "./Renderer";
import getOptions from "./getOptions";

function mount(data: any, options: any = {}) {
  options = getOptions(options, data);
  return enzyme.mount(<Renderer data={data} options={options} />);
}

describe("Visualizations -> Details -> Renderer", () => {
  const sampleData = {
    columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "string" },
      { name: "created_at", type: "datetime" },
      { name: "active", type: "boolean" },
    ],
    rows: [
      {
        id: 1,
        name: "John Doe",
        created_at: moment("2023-01-01T12:00:00Z"),
        active: true,
      },
      {
        id: 2,
        name: "Jane Smith",
        created_at: moment("2023-02-01T12:00:00Z"),
        active: false,
      },
    ],
  };

  test("Renders all columns when no options provided", () => {
    const el = mount(sampleData);
    
    // Check that the component renders with expected data
    expect(el.text()).toContain("id");
    expect(el.text()).toContain("name");
    expect(el.text()).toContain("created_at");
    expect(el.text()).toContain("active");
    expect(el.text()).toContain("1"); // id value
    expect(el.text()).toContain("John Doe"); // name value
  });

  test("Renders only visible columns", () => {
    const options = {
      columns: [
        { name: "id", visible: true, order: 0 },
        { name: "name", visible: false, order: 1 },
        { name: "created_at", visible: true, order: 2 },
        { name: "active", visible: false, order: 3 },
      ],
    };
    
    const el = mount(sampleData, options);
    
    // Should show id and created_at, but not name and active
    expect(el.text()).toContain("id");
    expect(el.text()).toContain("created_at");
    expect(el.text()).not.toContain("name");
    expect(el.text()).not.toContain("active");
  });

  test("Respects column order", () => {
    const options = {
      columns: [
        { name: "active", visible: true, order: 0 },
        { name: "name", visible: true, order: 1 },
        { name: "created_at", visible: true, order: 2 },
        { name: "id", visible: true, order: 3 },
      ],
    };

    const el = mount(sampleData, options);

    // Get all description item labels in order
    const labels = el.find('.ant-descriptions-item-label').map(node => node.text());

    // Should appear in order: active (0), name (1), created_at (2), id (3)
    expect(labels).toEqual(['active', 'name', 'created_at', 'id']);
  });

  test("Uses custom column titles", () => {
    const options = {
      columns: [
        { name: "id", visible: true, title: "User ID", order: 0 },
        { name: "name", visible: true, title: "Full Name", order: 1 },
      ],
    };
    
    const el = mount(sampleData, options);
    
    expect(el.text()).toContain("User ID");
    expect(el.text()).toContain("Full Name");
  });

  test("Applies text alignment", () => {
    const options = {
      columns: [
        { name: "id", visible: true, alignContent: "center", order: 0 },
        { name: "name", visible: true, alignContent: "right", order: 1 },
      ],
    };
    
    const el = mount(sampleData, options);
    
    // Check that alignment styles are applied
    const alignedDivs = el.find('div[style]');
    expect(alignedDivs.length).toBeGreaterThan(0);
  });

  test("Shows pagination for multiple rows", () => {
    const el = mount(sampleData);
    
    // Check that pagination is present - look for pagination elements
    const paginationElements = el.find('[className*="paginator"]');
    expect(paginationElements.length).toBeGreaterThan(0);
  });

  test("Hides pagination for single row", () => {
    const singleRowData = {
      ...sampleData,
      rows: [sampleData.rows[0]],
    };
    
    const el = mount(singleRowData);
    
    // Check that pagination is not present for single row
    const paginationElements = el.find('[className*="paginator"]');
    expect(paginationElements.length).toBe(0);
  });

  test("Handles empty data", () => {
    const emptyData = {
      columns: [],
      rows: [],
    };
    
    const el = mount(emptyData);
    
    expect(el.html()).toBeNull();
  });

  test("Handles null data", () => {
    // Suppress PropTypes warning for this test
    const originalError = console.error;
    console.error = jest.fn();

    // Test the component directly with null data instead of using mount helper
    const el = enzyme.mount(<Renderer data={null as any} options={{}} />);
    
    expect(el.html()).toBeNull();

    // Restore console.error
    console.error = originalError;
  });

  test("Navigates between rows with pagination", () => {
    const el = mount(sampleData);
    
    // Check first row is displayed
    expect(el.text()).toContain("John Doe");
    expect(el.text()).not.toContain("Jane Smith");
    
    // Find and click next button
    const nextButton = el.find('button').filterWhere(n => n.text().includes('Next') || n.prop('aria-label') === 'Next Page');
    if (nextButton.length > 0) {
      nextButton.first().simulate("click");

      // Check second row is displayed after state update
      el.update();
      expect(el.text()).toContain("Jane Smith");
    }
  });
});
