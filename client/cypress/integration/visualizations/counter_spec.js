/* global cy, Cypress */

import { createQuery, createVisualization } from "../../support/redash-api";

const { merge } = Cypress._;

const SQL = `
  SELECT 27182.8182846 AS a, 20000 AS b, 'lorem' AS c UNION ALL
  SELECT 31415.9265359 AS a, 40000 AS b, 'ipsum' AS c
`;

const counterOptions = {
  schemaVersion: 2,

  primaryValue: {
    type: "rowValue",
    column: "counter",
    rowNumber: 1,
    displayFormat: "{{ @@value_formatted }}",
    showTooltip: true,
    tooltipFormat: "{{ @@value }}",
  },
  secondaryValue: {
    show: true,
    type: "unused",
    column: null,
    rowNumber: 1,
    displayFormat: "({{ @@value_formatted }})",
    showTooltip: true,
    tooltipFormat: "{{ @@value }}",
  },
};

describe("Counter", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
  });

  it("creates Counter (custom formatting)", () => {
    createQuery({ query: SQL })
      .then(({ id }) =>
        createVisualization(
          id,
          "COUNTER",
          "Counter",
          merge({}, counterOptions, {
            counterLabel: "Test",
            stringDecChar: ",",
            stringThouSep: "'",
            numberFormat: "0,0.000",

            primaryValue: {
              type: "rowValue",
              column: "a",
              rowNumber: 1,
              displayFormat: "$$ {{ @@value_formatted }} %%",
            },
            secondaryValue: {
              type: "unused",
            },
          })
        )
      )
      .then(({ id: visualizationId, query_id: queryId }) => {
        cy.visit(`queries/${queryId}/source#${visualizationId}`);
        cy.getByTestId("ExecuteButton").click();

        cy.getByTestId(`QueryPageVisualization${visualizationId}`)
          .find(".counter-visualization-container")
          .should("exist");

        // wait a bit before taking snapshot
        cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
        cy.percySnapshot("Visualizations - Counter (custom formatting)", { widths: [viewportWidth] });
      });
  });

  it("creates Counter (trend positive)", () => {
    createQuery({ query: SQL })
      .then(({ id }) =>
        createVisualization(
          id,
          "COUNTER",
          "Counter",
          merge({}, counterOptions, {
            primaryValue: {
              type: "rowValue",
              column: "b",
              rowNumber: 2,
            },
            secondaryValue: {
              type: "rowValue",
              column: "b",
              rowNumber: 1,
            },
          })
        )
      )
      .then(({ id: visualizationId, query_id: queryId }) => {
        cy.visit(`queries/${queryId}/source#${visualizationId}`);
        cy.getByTestId("ExecuteButton").click();

        cy.getByTestId(`QueryPageVisualization${visualizationId}`)
          .find(".counter-visualization-container")
          .should("exist");

        // wait a bit before taking snapshot
        cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
        cy.percySnapshot("Visualizations - Counter (trend positive)", { widths: [viewportWidth] });
      });
  });

  it("creates Counter (trend negative)", () => {
    createQuery({ query: SQL })
      .then(({ id }) =>
        createVisualization(
          id,
          "COUNTER",
          "Counter",
          merge({}, counterOptions, {
            primaryValue: {
              type: "rowValue",
              column: "b",
              rowNumber: 1,
            },
            secondaryValue: {
              type: "rowValue",
              column: "b",
              rowNumber: 2,
            },
          })
        )
      )
      .then(({ id: visualizationId, query_id: queryId }) => {
        cy.visit(`queries/${queryId}/source#${visualizationId}`);
        cy.getByTestId("ExecuteButton").click();

        cy.getByTestId(`QueryPageVisualization${visualizationId}`)
          .find(".counter-visualization-container")
          .should("exist");

        // wait a bit before taking snapshot
        cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
        cy.percySnapshot("Visualizations - Counter (trend negative)", { widths: [viewportWidth] });
      });
  });
});
