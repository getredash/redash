import getOptions from "./getOptions";

describe("Visualizations -> Details -> getOptions", () => {
  const sampleData = {
    columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "string" },
      { name: "created_at", type: "datetime" },
      { name: "is_active", type: "boolean" },
      { name: "score", type: "float" },
    ],
  };

  test("Returns default options when no options provided", () => {
    const result = getOptions({}, sampleData);

    expect(result.columns).toHaveLength(5);
    expect(result.columns[0]).toEqual(
      expect.objectContaining({
        name: "id",
        type: "integer",
        displayAs: "number",
        visible: true,
        alignContent: "right",
        title: "id",
        description: "",
        allowHTML: false,
        highlightLinks: false,
      })
    );
  });

  test("Preserves existing column options", () => {
    const existingOptions = {
      columns: [
        {
          name: "id",
          visible: false,
          title: "User ID",
          alignContent: "center",
        },
      ],
    };

    const result = getOptions(existingOptions, sampleData);

    const idColumn = result.columns.find((col: any) => col.name === "id");
    expect(idColumn).toEqual(
      expect.objectContaining({
        visible: false,
        title: "User ID",
        alignContent: "center",
      })
    );
  });

  test("Sets correct default display types", () => {
    const result = getOptions({}, sampleData);

    const columnsByName = result.columns.reduce((acc: any, col: any) => {
      acc[col.name] = col;
      return acc;
    }, {} as any);

    expect(columnsByName.id.displayAs).toBe("number");
    expect(columnsByName.name.displayAs).toBe("string");
    expect(columnsByName.created_at.displayAs).toBe("datetime");
    expect(columnsByName.is_active.displayAs).toBe("boolean");
    expect(columnsByName.score.displayAs).toBe("number");
  });

  test("Sets correct default alignments", () => {
    const result = getOptions({}, sampleData);

    const columnsByName = result.columns.reduce((acc: any, col: any) => {
      acc[col.name] = col;
      return acc;
    }, {} as any);

    expect(columnsByName.id.alignContent).toBe("right");
    expect(columnsByName.name.alignContent).toBe("left");
    expect(columnsByName.created_at.alignContent).toBe("right");
    expect(columnsByName.is_active.alignContent).toBe("right");
    expect(columnsByName.score.alignContent).toBe("right");
  });

  test("Handles column name type suffixes", () => {
    const dataWithTypeSuffixes = {
      columns: [
        { name: "user::filter", type: "string" },
        { name: "amount__multiFilter", type: "float" },
        { name: "::date_field", type: "date" },
      ],
    };

    const result = getOptions({}, dataWithTypeSuffixes);

    expect(result.columns[0].title).toBe("user");
    expect(result.columns[1].title).toBe("amount");
    expect(result.columns[2].title).toBe("date_field");
  });

  test("Maintains column order from existing options", () => {
    const existingOptions = {
      columns: [
        { name: "name", order: 0 },
        { name: "id", order: 1 },
      ],
    };

    const result = getOptions(existingOptions, sampleData);

    expect(result.columns[0].name).toBe("name");
    expect(result.columns[1].name).toBe("id");
  });

  test("Handles missing columns in existing options", () => {
    const existingOptions = {
      columns: [
        { name: "id", visible: false },
        { name: "nonexistent", visible: true },
      ],
    };

    const result = getOptions(existingOptions, sampleData);

    // Should include all data columns
    expect(result.columns).toHaveLength(5);
    
    // Should preserve settings for existing columns
    const idColumn = result.columns.find((col: any) => col.name === "id");
    expect(idColumn.visible).toBe(false);
  });

  test("Includes default format options", () => {
    const result = getOptions({}, sampleData);

    const column = result.columns[0];
    expect(column).toEqual(
      expect.objectContaining({
        booleanValues: ["false", "true"],
        imageUrlTemplate: "{{ @ }}",
        imageTitleTemplate: "{{ @ }}",
        imageWidth: "",
        imageHeight: "",
        linkUrlTemplate: "{{ @ }}",
        linkTextTemplate: "{{ @ }}",
        linkTitleTemplate: "{{ @ }}",
        linkOpenInNewTab: true,
      })
    );
  });

  test("Handles empty data", () => {
    const emptyData = { columns: [] };
    const result = getOptions({}, emptyData);

    expect(result.columns).toEqual([]);
  });
});
