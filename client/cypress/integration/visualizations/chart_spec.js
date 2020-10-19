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

function createChartThroughUI(visualizationName) {
  cy.getByTestId("NewVisualization").click();
  cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.CHART");
  cy.getByTestId("VisualizationName")
    .clear()
    .type(visualizationName);

  // Checks for TabbedEditor standard tabs
  cy.getByTestId("Chart.GlobalSeriesType").should("exist");

  cy.getByTestId("VisualizationEditor.Tabs.Series").click();
  cy.getByTestId("VisualizationEditor")
    .find("table")
    .should("exist");

  cy.getByTestId("VisualizationEditor.Tabs.Colors").click();
  cy.getByTestId("VisualizationEditor")
    .find("table")
    .should("exist");

  cy.getByTestId("VisualizationEditor.Tabs.DataLabels").click();
  cy.getByTestId("VisualizationEditor")
    .getByTestId("Chart.DataLabels.ShowDataLabels")
    .should("exist");

  cy.getByTestId("VisualizationEditor.Tabs.General").click();
}

function assertAxesAndAddLabels() {
  cy.getByTestId("VisualizationEditor.Tabs.XAxis").click();
  cy.getByTestId("Chart.XAxis.Type")
    .contains(".ant-select-selection-item", "Auto Detect")
    .should("exist");

  cy.getByTestId("Chart.XAxis.Name")
    .clear()
    .type("Stage 1");

  cy.getByTestId("VisualizationEditor.Tabs.YAxis").click();
  cy.getByTestId("Chart.LeftYAxis.Type")
    .contains(".ant-select-selection-item", "Linear")
    .should("exist");

  cy.getByTestId("Chart.LeftYAxis.Name")
    .clear()
    .type("Value");
}

describe("Chart", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ name: "Chart Visualization", query: SQL })
      .its("id")
      .as("queryId");
  });

  it("creates Bar Chart", function() {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId("ExecuteButton").click();

    const visualizationName = "Bar Chart";

    createChartThroughUI(visualizationName);

    // standard chart should be bar
    cy.getByTestId("Chart.GlobalSeriesType").contains(".ant-select-selection-item", "Bar");

    cy.getByTestId("VisualizationPreview")
      .find("g.plot")
      .should("exist")
      .find("g.points")
      .should("not.exist");

    cy.getByTestId("Chart.ColumnMapping.y").selectAntdOption("Chart.ColumnMapping.y.value");
    cy.getByTestId("Chart.ColumnMapping.x").selectAntdOption("Chart.ColumnMapping.x.stage1");

    cy.getByTestId("VisualizationPreview")
      .find("g.plot")
      .should("exist")
      .find("g.points")
      .should("exist");

    // checks for axes default scales and set custom labels
    assertAxesAndAddLabels();

    cy.getByTestId("EditVisualizationDialog")
      .contains("button", "Save")
      .click();

    cy.getByTestId("QueryPageVisualizationTabs")
      .contains("span", visualizationName)
      .should("exist");
  });
});
