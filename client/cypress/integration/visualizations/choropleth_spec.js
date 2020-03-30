/* global cy, Cypress */

import { createQuery } from "../../support/redash-api";

const SQL = `
  SELECT 'AR' AS "code", 'Argentina' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'AU' AS "code", 'Australia' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'AT' AS "code", 'Austria' AS "name", 42.62 AS "value" UNION ALL
  SELECT 'BE' AS "code", 'Belgium' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'BR' AS "code", 'Brazil' AS "name", 190.10 AS "value" UNION ALL
  SELECT 'CA' AS "code", 'Canada' AS "name", 303.96 AS "value" UNION ALL
  SELECT 'CL' AS "code", 'Chile' AS "name", 46.62 AS "value" UNION ALL
  SELECT 'CZ' AS "code", 'Czech Republic' AS "name", 90.24 AS "value" UNION ALL
  SELECT 'DK' AS "code", 'Denmark' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'FI' AS "code", 'Finland' AS "name", 41.62 AS "value" UNION ALL
  SELECT 'FR' AS "code", 'France' AS "name", 195.10 AS "value" UNION ALL
  SELECT 'DE' AS "code", 'Germany' AS "name", 156.48 AS "value" UNION ALL
  SELECT 'HU' AS "code", 'Hungary' AS "name", 45.62 AS "value" UNION ALL
  SELECT 'IN' AS "code", 'India' AS "name", 75.26 AS "value" UNION ALL
  SELECT 'IE' AS "code", 'Ireland' AS "name", 45.62 AS "value" UNION ALL
  SELECT 'IT' AS "code", 'Italy' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'NL' AS "code", 'Netherlands' AS "name", 40.62 AS "value" UNION ALL
  SELECT 'NO' AS "code", 'Norway' AS "name", 39.62 AS "value" UNION ALL
  SELECT 'PL' AS "code", 'Poland' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'PT' AS "code", 'Portugal' AS "name", 77.24 AS "value" UNION ALL
  SELECT 'ES' AS "code", 'Spain' AS "name", 37.62 AS "value" UNION ALL
  SELECT 'SE' AS "code", 'Sweden' AS "name", 38.62 AS "value" UNION ALL
  SELECT 'US' AS "code", 'USA' AS "name", 523.06 AS "value" UNION ALL
  SELECT 'GB' AS "code", 'United Kingdom' AS "name", 112.86 AS "value"
`;

describe("Choropleth", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId("ExecuteButton").click();
    });
  });

  it("creates visualization", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.CHOROPLETH
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Choropleth.Editor.MapType
      Choropleth.Editor.MapType.Countries
      Choropleth.Editor.KeyColumn
      Choropleth.Editor.KeyColumn.name
      Choropleth.Editor.KeyType
      Choropleth.Editor.KeyType.name
      Choropleth.Editor.ValueColumn
      Choropleth.Editor.ValueColumn.value
    `);

    cy.clickThrough("VisualizationEditor.Tabs.Colors");
    cy.clickThrough("Choropleth.Editor.Colors.Min");
    cy.fillInputs({ "ColorPicker.CustomColor": "yellow{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");
    cy.clickThrough("Choropleth.Editor.Colors.Max");
    cy.fillInputs({ "ColorPicker.CustomColor": "red{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");
    cy.clickThrough("Choropleth.Editor.Colors.Borders");
    cy.fillInputs({ "ColorPicker.CustomColor": "black{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");

    cy.clickThrough(`
      VisualizationEditor.Tabs.Format
      Choropleth.Editor.LegendPosition
      Choropleth.Editor.LegendPosition.TopRight
    `);

    cy.getByTestId("Choropleth.Editor.LegendTextAlignment")
      .find('[data-test="TextAlignmentSelect.Left"]')
      .check({ force: true });

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find(".map-visualization-container.leaflet-container")
      .should("exist");
    cy.percySnapshot("Visualizations - Choropleth", { widths: [viewportWidth] });
  });
});
