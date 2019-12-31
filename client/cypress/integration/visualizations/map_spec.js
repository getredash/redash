/* global cy */

import { createQuery } from "../../support/redash-api";

const SQL = `
  SELECT 'Israel' AS country, 32.0808800 AS lat, 34.7805700 AS lng UNION ALL 
  SELECT 'Israel' AS country, 31.7690400 AS lat, 35.2163300 AS lng UNION ALL
  SELECT 'Israel' AS country, 32.8184100 AS lat, 34.9885000 AS lng UNION ALL
  
  SELECT 'Ukraine' AS country, 50.4546600 AS lat, 30.5238000 AS lng UNION ALL
  SELECT 'Ukraine' AS country, 49.8382600 AS lat, 24.0232400 AS lng UNION ALL 
  SELECT 'Ukraine' AS country, 49.9808100 AS lat, 36.2527200 AS lng UNION ALL 

  SELECT 'Hungary' AS country, 47.4980100 AS lat, 19.0399100 AS lng
`;

describe("Map (Markers)", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId("ExecuteButton").click();
    });
  });

  it("creates Map with groups", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.MAP
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Map.Editor.LatitudeColumnName
      Map.Editor.LatitudeColumnName.lat
      Map.Editor.LongitudeColumnName
      Map.Editor.LongitudeColumnName.lng
      Map.Editor.GroupBy
      Map.Editor.GroupBy.country
    `);

    cy.clickThrough("VisualizationEditor.Tabs.Groups");
    cy.clickThrough("Map.Editor.Groups.Israel.Color");
    cy.fillInputs({ "ColorPicker.CustomColor": "red{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");
    cy.clickThrough("Map.Editor.Groups.Ukraine.Color");
    cy.fillInputs({ "ColorPicker.CustomColor": "green{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");
    cy.clickThrough("Map.Editor.Groups.Hungary.Color");
    cy.fillInputs({ "ColorPicker.CustomColor": "blue{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");

    cy.getByTestId("VisualizationPreview")
      .find(".leaflet-control-zoom-in")
      .click();

    // Wait for proper initialization of visualization
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Visualizations - Map (Markers) with groups", { widths: [viewportWidth] });
  });

  it("creates Map with custom markers", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.MAP
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.General
      Map.Editor.LatitudeColumnName
      Map.Editor.LatitudeColumnName.lat
      Map.Editor.LongitudeColumnName
      Map.Editor.LongitudeColumnName.lng
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.Style
      Map.Editor.ClusterMarkers
      Map.Editor.CustomizeMarkers
    `);

    cy.fillInputs({ "Map.Editor.MarkerIcon": "home" }, { wait: 250 }); // this input is debounced

    cy.clickThrough("Map.Editor.MarkerBackgroundColor");
    cy.fillInputs({ "ColorPicker.CustomColor": "red{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");
    cy.clickThrough("Map.Editor.MarkerBorderColor");
    cy.fillInputs({ "ColorPicker.CustomColor": "maroon{enter}" });
    cy.getByTestId("ColorPicker.CustomColor").should("not.be.visible");

    cy.getByTestId("VisualizationPreview")
      .find(".leaflet-control-zoom-in")
      .click();

    // Wait for proper initialization of visualization
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Visualizations - Map (Markers) with custom markers", { widths: [viewportWidth] });
  });
});
