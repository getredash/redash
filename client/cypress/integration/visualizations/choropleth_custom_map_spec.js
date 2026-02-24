/* global cy */

const SQL = `
  SELECT 'US' AS "code", 'USA' AS "name", 523.06 AS "value" UNION ALL
  SELECT 'GB' AS "code", 'United Kingdom' AS "name", 112.86 AS "value" UNION ALL
  SELECT 'FR' AS "code", 'France' AS "name", 195.10 AS "value"
`;

const STUB_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "TestRegion", iso_a2: "US" },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    },
    {
      type: "Feature",
      properties: { name: "TestRegion2", iso_a2: "GB" },
      geometry: { type: "Polygon", coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] },
    },
  ],
};

describe("Choropleth - Custom Map", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.wait(1500); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ExecuteButton").click();
    });
    cy.getByTestId("NewVisualization").click();
    cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.CHOROPLETH");
  });

  it("shows URL input when Custom map is selected", () => {
    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Choropleth.Editor.MapType
    `);
    cy.getByTestId("Choropleth.Editor.MapType.custom").click({ force: true });

    cy.getByTestId("Choropleth.Editor.CustomMapUrl").should("exist");
    cy.getByTestId("Choropleth.Editor.CustomMapUrl")
      .should("have.attr", "placeholder")
      .and("contain", "example.com");
  });

  it("loads custom GeoJSON and renders paths", () => {
    cy.intercept("GET", "https://example.com/map.geo.json", STUB_GEOJSON).as("GeoJsonFetch");

    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Choropleth.Editor.MapType
    `);
    cy.getByTestId("Choropleth.Editor.MapType.custom").click({ force: true });

    cy.getByTestId("Choropleth.Editor.CustomMapUrl").clear().type("https://example.com/map.geo.json");

    cy.wait("@GeoJsonFetch");
    cy.getByTestId("VisualizationPreview")
      .find("path")
      .should("have.length.gte", 1);
  });

  it("hides URL input when switching back to built-in map", () => {
    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Choropleth.Editor.MapType
    `);
    cy.getByTestId("Choropleth.Editor.MapType.custom").click({ force: true });
    cy.getByTestId("Choropleth.Editor.CustomMapUrl").should("exist");

    // Switch back to Countries
    cy.getByTestId("Choropleth.Editor.MapType").selectAntdOption("Choropleth.Editor.MapType.countries");
    cy.getByTestId("Choropleth.Editor.CustomMapUrl").should("not.exist");

    cy.wait(2000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find("path")
      .should("have.length.gte", 50);
  });
});
