/* global cy, Cypress */

import { createQuery, createVisualization } from "../../support/redash-api";

const SQL = `
  SELECT 12 AS mn, 4967 AS mx UNION ALL
  SELECT 10 AS mn, 19430 AS mx UNION ALL
  SELECT 3132 AS mn, 3275 AS mx UNION ALL
  SELECT 2 AS mn, 19429 AS mx UNION ALL
  SELECT 7 AS mn, 19433 AS mx UNION ALL
  SELECT 4824 AS mn, 4824 AS mx UNION ALL
  SELECT 11353 AS mn, 16565 AS mx UNION ALL
  SELECT 551 AS mn, 19415 AS mx UNION ALL
  SELECT 307 AS mn, 17918 AS mx UNION ALL
  SELECT 25 AS mn, 19436 AS mx UNION ALL
  SELECT 98 AS mn, 19230 AS mx UNION ALL
  SELECT 1652 AS mn, 1667 AS mx UNION ALL
  SELECT 4486 AS mn, 4486 AS mx UNION ALL
  SELECT 5113 AS mn, 5120 AS mx UNION ALL
  SELECT 1642 AS mn, 1678 AS mx UNION ALL
  SELECT 1632 AS mn, 16183 AS mx UNION ALL
  SELECT 8 AS mn, 19434 AS mx UNION ALL
  SELECT 13149 AS mn, 16945 AS mx UNION ALL
  SELECT 340 AS mn, 340 AS mx UNION ALL
  SELECT 15495 AS mn, 16559 AS mx UNION ALL
  SELECT 24 AS mn, 19266 AS mx UNION ALL
  SELECT 532 AS mn, 19283 AS mx UNION ALL
  SELECT 4958 AS mn, 4958 AS mx UNION ALL
  SELECT 10078 AS mn, 10079 AS mx UNION ALL
  SELECT 102 AS mn, 17895 AS mx UNION ALL
  SELECT 5366 AS mn, 18463 AS mx UNION ALL
  SELECT 11363 AS mn, 16552 AS mx UNION ALL
  SELECT 1 AS mn, 5211 AS mx UNION ALL
  SELECT 6 AS mn, 19431 AS mx UNION ALL
  SELECT 11378 AS mn, 16946 AS mx UNION ALL
  SELECT 4676 AS mn, 4944 AS mx UNION ALL
  SELECT 5228 AS mn, 18466 AS mx
`;

describe("Box Plot", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL })
      .then(({ id }) => createVisualization(id, "BOXPLOT", "Boxplot (Deprecated)", {}))
      .then(({ id: visualizationId, query_id: queryId }) => {
        cy.visit(`queries/${queryId}/source#${visualizationId}`);
        cy.getByTestId("ExecuteButton").click();
      });
  });

  it("creates visualization", () => {
    cy.clickThrough(`
      EditVisualization
    `);

    cy.fillInputs({
      "BoxPlot.XAxisLabel": "X Axis",
      "BoxPlot.YAxisLabel": "Y Axis",
    });

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("VisualizationPreview")
      .find("svg")
      .should("exist");

    cy.percySnapshot("Visualizations - Box Plot", { widths: [viewportWidth] });
  });
});
