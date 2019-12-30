/* global cy, Cypress */

import { createQuery } from "../../support/redash-api";

const SQL = `
  SELECT 'a.01' AS a, 1.758831600227 AS b UNION ALL
  SELECT 'a.02' AS a, 613.4456936572 AS b UNION ALL
  SELECT 'a.03' AS a, 9.045647090023 AS b UNION ALL
  SELECT 'a.04' AS a, 29.37836413439 AS b UNION ALL
  SELECT 'a.05' AS a, 642.9434910444 AS b UNION ALL
  SELECT 'a.06' AS a, 176.7634164480 AS b UNION ALL
  SELECT 'a.07' AS a, 279.4880059198 AS b UNION ALL
  SELECT 'a.08' AS a, 78.48128609207 AS b UNION ALL
  SELECT 'a.09' AS a, 14.10443892662 AS b UNION ALL
  SELECT 'a.10' AS a, 59.25097112438 AS b UNION ALL
  SELECT 'a.11' AS a, 61.58610868125 AS b UNION ALL
  SELECT 'a.12' AS a, 277.8473055268 AS b UNION ALL
  SELECT 'a.13' AS a, 621.1535090415 AS b UNION ALL
  SELECT 'a.14' AS a, 261.1409234646 AS b UNION ALL
  SELECT 'a.15' AS a, 72.94883358030 AS b
`;

describe("Funnel", () => {
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
      VisualizationType.FUNNEL
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.General

      Funnel.StepColumn
      Funnel.StepColumn.a
      Funnel.ValueColumn
      Funnel.ValueColumn.b

      Funnel.CustomSort
      Funnel.SortColumn
      Funnel.SortColumn.b
      Funnel.SortDirection
      Funnel.SortDirection.Ascending
    `);

    cy.fillInputs(
      {
        "Funnel.StepColumnTitle": "Column A",
        "Funnel.ValueColumnTitle": "Column B",
      },
      { wait: 200 }
    ); // inputs are debounced

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find("table")
      .should("exist");
    cy.percySnapshot("Visualizations - Funnel (basic)", { widths: [viewportWidth] });

    cy.clickThrough(`
      VisualizationEditor.Tabs.Appearance
    `);

    cy.fillInputs(
      {
        "Funnel.NumberFormat": "0[.]00",
        "Funnel.PercentFormat": "0[.]0000%",
        "Funnel.ItemsLimit": "10",
        "Funnel.PercentRangeMin": "10",
        "Funnel.PercentRangeMax": "90",
      },
      { wait: 200 }
    ); // inputs are debounced

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find("table")
      .should("exist");
    cy.percySnapshot("Visualizations - Funnel (extra options)", { widths: [viewportWidth] });
  });
});
