import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import moment from "moment";

import Renderer from "./Renderer";
import getOptions from "./getOptions";

function mount(data: any, options: any = {}) {
  options = getOptions(options, data);
  const { container } = render(<Renderer data={data} options={options} />);
  return container;
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
    const text = el.textContent || "";

    expect(text).toContain("id");
    expect(text).toContain("name");
    expect(text).toContain("created_at");
    expect(text).toContain("active");
    expect(text).toContain("1");
    expect(text).toContain("John Doe");
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
    const text = el.textContent || "";

    expect(text).toContain("id");
    expect(text).toContain("created_at");
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
    const labels = Array.from(el.querySelectorAll(".ant-descriptions-item-label")).map(
      node => node.textContent
    );

    expect(labels).toEqual(["active", "name", "created_at", "id"]);
  });

  test("Uses custom column titles", () => {
    const options = {
      columns: [
        { name: "id", visible: true, title: "User ID", order: 0 },
        { name: "name", visible: true, title: "Full Name", order: 1 },
      ],
    };

    const el = mount(sampleData, options);
    const text = el.textContent || "";

    expect(text).toContain("User ID");
    expect(text).toContain("Full Name");
  });

  test("Applies text alignment", () => {
    const options = {
      columns: [
        { name: "id", visible: true, alignContent: "center", order: 0 },
        { name: "name", visible: true, alignContent: "right", order: 1 },
      ],
    };

    const el = mount(sampleData, options);
    const alignedDivs = el.querySelectorAll("div[style]");
    expect(alignedDivs.length).toBeGreaterThan(0);
  });

  test("Shows pagination for multiple rows", () => {
    const el = mount(sampleData);
    const paginationElements = el.querySelectorAll('[class*="paginator"]');
    expect(paginationElements.length).toBeGreaterThan(0);
  });

  test("Hides pagination for single row", () => {
    const singleRowData = {
      ...sampleData,
      rows: [sampleData.rows[0]],
    };

    const el = mount(singleRowData);
    const paginationElements = el.querySelectorAll('[class*="paginator"]');
    expect(paginationElements.length).toBe(0);
  });

  test("Handles empty data", () => {
    const emptyData = {
      columns: [],
      rows: [],
    };

    const el = mount(emptyData);
    expect(el.innerHTML).toBe("");
  });

  test("Handles null data", () => {
    const originalError = console.error;
    console.error = jest.fn();

    const { container } = render(<Renderer data={null as any} options={{}} />);
    expect(container.innerHTML).toBe("");

    console.error = originalError;
  });

  test("Navigates between rows with pagination", () => {
    const el = mount(sampleData);
    expect(el.textContent).toContain("John Doe");

    // antd Pagination renders the next button inside .ant-pagination-next
    const nextButton = document.body.querySelector('.ant-pagination-next button')
      || document.body.querySelector('.ant-pagination-next');
    expect(nextButton).not.toBeNull();
    
    fireEvent.click(nextButton!);
    expect(el.textContent).toContain("Jane Smith");
  });
});
