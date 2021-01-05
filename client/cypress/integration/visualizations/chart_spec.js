/* global cy */

import { getWidgetTestId } from "../../support/dashboard";
import {
  assertAxesAndAddLabels,
  assertPlotPreview,
  assertTabbedEditor,
  createChartThroughUI,
  createDashboardWithCharts,
} from "../../support/visualizations/chart";

const SQL = `
  SELECT 'a' AS stage, 11 AS value1, 22 AS value2 UNION ALL
  SELECT 'a' AS stage, 12 AS value1, 41 AS value2 UNION ALL
  SELECT 'a' AS stage, 45 AS value1, 93 AS value2 UNION ALL
  SELECT 'a' AS stage, 54 AS value1, 79 AS value2 UNION ALL
  SELECT 'b' AS stage, 33 AS value1, 65 AS value2 UNION ALL
  SELECT 'b' AS stage, 73 AS value1, 50 AS value2 UNION ALL
  SELECT 'b' AS stage, 90 AS value1, 40 AS value2 UNION ALL
  SELECT 'c' AS stage, 19 AS value1, 33 AS value2 UNION ALL
  SELECT 'c' AS stage, 92 AS value1, 14 AS value2 UNION ALL
  SELECT 'c' AS stage, 63 AS value1, 65 AS value2 UNION ALL
  SELECT 'c' AS stage, 44 AS value1, 27 AS value2\
`;

describe("Chart", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ name: "Chart Visualization", query: SQL })
      .its("id")
      .as("queryId");
  });

  it("creates Bar charts", function() {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId("ExecuteButton").click();

    const getBarChartAssertionFunction = (specificBarChartAssertionFn = () => {}) => () => {
      // checks for TabbedEditor standard tabs
      assertTabbedEditor();

      // standard chart should be bar
      cy.getByTestId("Chart.GlobalSeriesType").contains(".ant-select-selection-item", "Bar");

      // checks the plot canvas exists and is empty
      assertPlotPreview("not.exist");

      // creates a chart and checks it is plotted
      cy.getByTestId("Chart.ColumnMapping.x").selectAntdOption("Chart.ColumnMapping.x.stage");
      cy.getByTestId("Chart.ColumnMapping.y").selectAntdOption("Chart.ColumnMapping.y.value1");
      cy.getByTestId("Chart.ColumnMapping.y").selectAntdOption("Chart.ColumnMapping.y.value2");
      assertPlotPreview("exist");

      specificBarChartAssertionFn();
    };

    const chartTests = [
      {
        name: "Basic Bar Chart",
        alias: "basicBarChart",
        assertionFn: () => {
          assertAxesAndAddLabels("Stage", "Value");
        },
      },
      {
        name: "Horizontal Bar Chart",
        alias: "horizontalBarChart",
        assertionFn: () => {
          cy.getByTestId("Chart.SwappedAxes").check();
          cy.getByTestId("VisualizationEditor.Tabs.XAxis").should("have.text", "Y Axis");
          cy.getByTestId("VisualizationEditor.Tabs.YAxis").should("have.text", "X Axis");
        },
      },
      {
        name: "Stacked Bar Chart",
        alias: "stackedBarChart",
        assertionFn: () => {
          cy.getByTestId("Chart.Stacking").selectAntdOption("Chart.Stacking.Stack");
        },
      },
      {
        name: "Normalized Bar Chart",
        alias: "normalizedBarChart",
        assertionFn: () => {
          cy.getByTestId("Chart.NormalizeValues").check();
        },
      },
    ];

    chartTests.forEach(({ name, alias, assertionFn }) => {
      createChartThroughUI(name, getBarChartAssertionFunction(assertionFn)).as(alias);
    });

    const chartGetters = chartTests.map(({ alias }) => alias);

    const withDashboardWidgetsAssertionFn = (widgetGetters, dashboardUrl) => {
      cy.visit(dashboardUrl);
      widgetGetters.forEach(widgetGetter => {
        cy.get(`@${widgetGetter}`).then(widget => {
          cy.getByTestId(getWidgetTestId(widget)).within(() => {
            cy.get("g.points").should("exist");
          });
        });
      });
    };

    createDashboardWithCharts("Bar chart visualizations", chartGetters, withDashboardWidgetsAssertionFn);
    cy.percySnapshot("Visualizations - Charts - Bar");
  });
});
