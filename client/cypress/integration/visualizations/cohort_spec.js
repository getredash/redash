/* global cy, Cypress */

import { createQuery } from "../../support/redash-api";

const SQL = `
  SELECT '2019-01-01' AS "date", 21 AS "bucket", 5 AS "value", 1 AS "stage" UNION ALL
  SELECT '2019-01-01' AS "date", 21 AS "bucket", 8 AS "value", 2 AS "stage" UNION ALL
  SELECT '2019-01-01' AS "date", 21 AS "bucket", 2 AS "value", 3 AS "stage" UNION ALL
  SELECT '2019-01-01' AS "date", 21 AS "bucket", 6 AS "value", 4 AS "stage" UNION ALL

  SELECT '2019-02-01' AS "date", 10 AS "bucket", 7 AS "value", 1 AS "stage" UNION ALL
  SELECT '2019-02-01' AS "date", 10 AS "bucket", 3 AS "value", 3 AS "stage" UNION ALL

  SELECT '2019-03-01' AS "date", 19 AS "bucket", 4 AS "value", 1 AS "stage" UNION ALL
  SELECT '2019-03-01' AS "date", 19 AS "bucket", 7 AS "value", 2 AS "stage" UNION ALL
  SELECT '2019-03-01' AS "date", 19 AS "bucket", 8 AS "value", 3 AS "stage" UNION ALL

  SELECT '2019-05-01' AS "date", 15 AS "bucket", 13 AS "value", 1 AS "stage" UNION ALL
  SELECT '2019-05-01' AS "date", 15 AS "bucket", 2 AS "value", 4 AS "stage"
`;

describe("Cohort", () => {
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
      VisualizationType.COHORT
    `);

    cy.clickThrough(`
      VisualizationEditor.Tabs.Options
      Cohort.TimeInterval
      Cohort.TimeInterval.monthly
      Cohort.Mode
      Cohort.Mode.simple

      VisualizationEditor.Tabs.Columns
      Cohort.DateColumn
      Cohort.DateColumn.date
      Cohort.StageColumn
      Cohort.StageColumn.stage
      Cohort.TotalColumn
      Cohort.TotalColumn.bucket
      Cohort.ValueColumn
      Cohort.ValueColumn.value
    `);

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find("table")
      .should("exist");
    cy.percySnapshot("Visualizations - Cohort (simple)", { widths: [viewportWidth] });

    cy.clickThrough(`
      VisualizationEditor.Tabs.Options
      Cohort.Mode
      Cohort.Mode.diagonal
    `);

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("VisualizationPreview")
      .find("table")
      .should("exist");
    cy.percySnapshot("Visualizations - Cohort (diagonal)", { widths: [viewportWidth] });
  });
});
