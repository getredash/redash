/* global cy */

import { getWidgetTestId } from "../../support/dashboard";

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
  SELECT 'c' AS stage1, 'c4' AS stage2, 44 AS value\
`;

function createPivotThroughUI(visualizationName, options = {}) {
  cy.getByTestId("NewVisualization").click();
  cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.PIVOT");
  cy.getByTestId("VisualizationName")
    .clear()
    .type(visualizationName);
  if (options.hideControls) {
    cy.getByTestId("PivotEditor.HideControls").click();
    cy.getByTestId("VisualizationPreview")
      .find("table")
      .find(".pvtAxisContainer, .pvtRenderer, .pvtVals")
      .should("be.not.visible");
  }
  cy.getByTestId("VisualizationPreview")
    .find("table")
    .should("exist");
  cy.getByTestId("EditVisualizationDialog")
    .contains("button", "Save")
    .click();
}

describe("Pivot", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ name: "Pivot Visualization", query: SQL })
      .its("id")
      .as("queryId");
  });

  it("creates Pivot with controls", function() {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId("ExecuteButton").click();

    const visualizationName = "Pivot";
    createPivotThroughUI(visualizationName);

    cy.getByTestId("QueryPageVisualizationTabs")
      .contains("span", visualizationName)
      .should("exist");
  });

  it("creates Pivot without controls", function() {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId("ExecuteButton").click();

    const visualizationName = "Pivot";

    cy.server();
    cy.route("POST", "**/api/visualizations").as("SaveVisualization");

    createPivotThroughUI(visualizationName, { hideControls: true });

    cy.wait("@SaveVisualization");
    // Added visualization should also have hidden controls
    cy.getByTestId("PivotTableVisualization")
      .find("table")
      .find(".pvtAxisContainer, .pvtRenderer, .pvtVals")
      .should("be.not.visible");
  });

  it("updates the visualization when results change", function() {
    const options = {
      aggregatorName: "Count",
      data: [], // force it to have a data object, although it shouldn't
      controls: { enabled: false },
      cols: ["stage1"],
      rows: ["stage2"],
      vals: ["value"],
    };

    cy.createVisualization(this.queryId, "PIVOT", "Pivot", options).then(visualization => {
      cy.visit(`queries/${this.queryId}/source#${visualization.id}`);
      cy.getByTestId("ExecuteButton").click();

      // assert number of rows is 11
      cy.getByTestId("PivotTableVisualization").contains(".pvtGrandTotal", "11");

      cy.getByTestId("QueryEditor")
        .get(".ace_text-input")
        .first()
        .focus()
        .type(" UNION ALL {enter}SELECT 'c' AS stage1, 'c5' AS stage2, 55 AS value");

      // wait for the query text change to propagate (it's debounced in QuerySource.jsx)
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(200);

      cy.getByTestId("SaveButton").click();
      cy.getByTestId("ExecuteButton")
        .should("be.enabled")
        .click();

      // assert number of rows is 12
      cy.getByTestId("PivotTableVisualization").contains(".pvtGrandTotal", "12");
    });
  });

  it("takes a snapshot with different configured Pivots", function() {
    const options = {
      aggregatorName: "Sum",
      controls: { enabled: true },
      cols: ["stage1"],
      rows: ["stage2"],
      vals: ["value"],
    };

    const pivotTables = [
      { name: "Pivot", options, position: { autoHeight: false, sizeY: 10, sizeX: 2 } },
      {
        name: "Pivot without Row Totals",
        options: { ...options, rendererOptions: { table: { rowTotals: false } } },
        position: { autoHeight: false, col: 2, sizeY: 10, sizeX: 2 },
      },
      {
        name: "Pivot without Col Totals",
        options: { ...options, rendererOptions: { table: { colTotals: false } } },
        position: { autoHeight: false, col: 4, sizeY: 10, sizeX: 2 },
      },
      {
        name: "Pivot with Controls",
        options: { ...options, controls: { enabled: false } },
        position: { autoHeight: false, row: 9, sizeY: 13 },
      },
    ];

    cy.createDashboard("Pivot Visualization")
      .then(dashboard => {
        this.dashboardUrl = `/dashboards/${dashboard.id}`;
        return cy.all(
          pivotTables.map(pivot => () =>
            cy
              .createVisualization(this.queryId, "PIVOT", pivot.name, pivot.options)
              .then(visualization => cy.addWidget(dashboard.id, visualization.id, { position: pivot.position }))
          )
        );
      })
      .then(widgets => {
        cy.visit(this.dashboardUrl);
        widgets.forEach(widget => {
          cy.getByTestId(getWidgetTestId(widget)).within(() =>
            cy.getByTestId("PivotTableVisualization").should("exist")
          );
        });
        cy.percySnapshot("Visualizations - Pivot Table");
      });
  });
});
