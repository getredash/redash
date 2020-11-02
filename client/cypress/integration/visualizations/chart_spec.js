/* global cy */

import { getWidgetTestId } from "../../support/dashboard";
import { get } from "lodash";

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

/**
 * Asserts the preview canvas exists, then captures the g.points element, which should be generated by plotly and asserts whether it exists
 * @param should Passed to should expression after plot points are captured
 */
function assertPlotPreview(should = "exist") {
  cy.getByTestId("VisualizationPreview")
    .find("g.plot")
    .should("exist")
    .find("g.points")
    .should(should);
}

function createChartThroughUI(chartName, chartSpecificAssertionFn = () => {}) {
  cy.getByTestId("NewVisualization").click();
  cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.CHART");
  cy.getByTestId("VisualizationName")
    .clear()
    .type(chartName);

  chartSpecificAssertionFn();

  cy.server();
  cy.route("POST", "**/api/visualizations").as("SaveVisualization");

  cy.getByTestId("EditVisualizationDialog")
    .contains("button", "Save")
    .click();

  cy.wait("@SaveVisualization").should("have.property", "status", 200);

  return cy.get("@SaveVisualization").then(xhr => {
    const { id, name, options } = xhr.response.body;

    cy.getByTestId("QueryPageVisualizationTabs")
      .contains("span", chartName)
      .should("exist");

    return cy.wrap({ id, name, options });
  });
}

function assertTabbedEditor(chartSpecificTabbedEditorAssertionFn = () => {}) {
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

  chartSpecificTabbedEditorAssertionFn();

  cy.getByTestId("VisualizationEditor.Tabs.General").click();
}

function assertAxesAndAddLabels(xaxisLabel, yaxisLabel) {
  cy.getByTestId("VisualizationEditor.Tabs.XAxis").click();
  cy.getByTestId("Chart.XAxis.Type")
    .contains(".ant-select-selection-item", "Auto Detect")
    .should("exist");

  cy.getByTestId("Chart.XAxis.Name")
    .clear()
    .type(xaxisLabel);

  cy.getByTestId("VisualizationEditor.Tabs.YAxis").click();
  cy.getByTestId("Chart.LeftYAxis.Type")
    .contains(".ant-select-selection-item", "Linear")
    .should("exist");

  cy.getByTestId("Chart.LeftYAxis.Name")
    .clear()
    .type(yaxisLabel);
}

function createDashboardWithCharts(title, charts, widgetsAssertionFn = () => {}) {
  return cy.createDashboard(title).then(dashboard => {
    const dashboardUrl = `/dashboards/${dashboard.id}`;
    return cy
      .all(
        charts.map((chart, i) => {
          const position = { autoHeight: false, sizeY: 8, sizeX: 3, col: (i % 2) * 3 };
          return () => cy.addWidget(dashboard.id, chart.id, { position });
        })
      )
      .then(widgets => widgetsAssertionFn(widgets, dashboardUrl));
  });
}

describe("Chart", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ name: "Chart Visualization", query: SQL })
      .its("id")
      .as("queryId");
  });

  const charts = [];

  it("creates Bar charts", function() {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId("ExecuteButton").click();

    const barChartAssertionFunction = () => {
      // checks for TabbedEditor standard tabs
      assertTabbedEditor();

      // standard chart should be bar
      cy.getByTestId("Chart.GlobalSeriesType").contains(".ant-select-selection-item", "Bar");

      // checks the plot canvas exists and is empty
      assertPlotPreview("not.exist");

      // creates a chart and checks it is plotted
      cy.getByTestId("Chart.ColumnMapping.y").selectAntdOption("Chart.ColumnMapping.y.value");
      cy.getByTestId("Chart.ColumnMapping.x").selectAntdOption("Chart.ColumnMapping.x.stage1");
      assertPlotPreview("exist");

      // checks for axes default scales and set custom labels
      assertAxesAndAddLabels("Stage 1", "Value");
    };

    createChartThroughUI("Basic Bar Chart", barChartAssertionFunction).then(basicBarChart => {
      charts.push(...Array(8).fill(Cypress.dom.unwrap(basicBarChart))); // temporary, testing behavior for multiple charts
    });
  });

  it("takes a snapshot with different configured Charts", function() {
    const withDashboardWidgetsAssertionFn = (widgets, dashboardUrl) => {
      cy.visit(dashboardUrl);
      widgets.forEach(widget => {
        cy.getByTestId(getWidgetTestId(widget)).within(() => cy.get("g.points").should("exist"));
      });
      cy.percySnapshot("Visualizations - Charts - Bar");
    };
    createDashboardWithCharts("Bar chart visualizations", [...charts], withDashboardWidgetsAssertionFn);
  });
});
