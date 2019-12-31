/* global cy */

import { createQuery } from "../../support/redash-api";

const SQL = `
  SELECT 'a' AS stage1, 'a1' AS stage2, 11 AS value UNION ALL
  SELECT 'a' AS stage1, 'a2' AS stage2, 12 AS value UNION ALL
  SELECT 'a' AS stage1, 'a3' AS stage2, 45 AS value UNION ALL
  SELECT 'a' AS stage1, 'a4' AS stage2, 54 AS value UNION ALL
  SELECT 'b' AS stage1, 'b1' AS stage2, 33 AS value UNION ALL
  SELECT 'b' AS stage1, 'b2' AS stage2, 73 AS value UNION ALL
  SELECT 'b' AS stage1, 'b3' AS stage2, 90 AS value UNION ALL
  SELECT 'c' AS stage1, 'c1' AS stage2, 19 AS value UNION ALL
  SELECT 'c' AS stage1, 'c2' AS stage2, 92 AS value UNION ALL
  SELECT 'c' AS stage1, 'c3' AS stage2, 63 AS value UNION ALL
  SELECT 'c' AS stage1, 'c4' AS stage2, 44 AS v
`;

describe("Sankey and Sunburst", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId("ExecuteButton").click();
    });
  });

  it("creates Sunburst", () => {
    const visualizationName = "Sunburst";

    cy.getByTestId("NewVisualization").click();
    cy.getByTestId("VisualizationType").click();
    cy.getByTestId("VisualizationType.SUNBURST_SEQUENCE").click();
    cy.getByTestId("VisualizationName")
      .clear()
      .type(visualizationName);
    cy.getByTestId("VisualizationPreview")
      .find("svg")
      .should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Visualizations - Sunburst", { widths: [viewportWidth] });

    cy.getByTestId("EditVisualizationDialog")
      .contains("button", "Save")
      .click();
    cy.getByTestId("QueryPageVisualizationTabs")
      .contains("span", visualizationName)
      .should("exist");
  });

  it("creates Sankey", () => {
    const visualizationName = "Sankey";

    cy.getByTestId("NewVisualization").click();
    cy.getByTestId("VisualizationType").click();
    cy.getByTestId("VisualizationType.SANKEY").click();
    cy.getByTestId("VisualizationName")
      .clear()
      .type(visualizationName);
    cy.getByTestId("VisualizationPreview")
      .find("svg")
      .should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Visualizations - Sankey", { widths: [viewportWidth] });

    cy.getByTestId("EditVisualizationDialog")
      .contains("button", "Save")
      .click();
    cy.getByTestId("QueryPageVisualizationTabs")
      .contains("span", visualizationName)
      .should("exist");
  });
});
