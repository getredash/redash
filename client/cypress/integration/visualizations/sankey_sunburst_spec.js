/* global cy */

import { getWidgetTestId } from "../../support/dashboard";

const SQL = `
  SELECT 'a' AS s1, 'a1' AS s2, 'a2' AS s3, null AS s4, null AS s5, 11 AS value UNION ALL
  SELECT 'a' AS s1, 'a2' AS s2, null AS s3, null AS s4, null AS s5, 12 AS value UNION ALL
  SELECT 'a' AS s1, 'a3' AS s2, null AS s3, null AS s4, null AS s5, 45 AS value UNION ALL
  SELECT 'a' AS s1, 'a4' AS s2, null AS s3, null AS s4, null AS s5, 54 AS value UNION ALL
  SELECT 'b' AS s1, 'b1' AS s2, 'a2' AS s3, 'c1' AS s4, null AS s5, 33 AS value UNION ALL
  SELECT 'b' AS s1, 'b2' AS s2, 'a4' AS s3, 'c3' AS s4, null AS s5, 73 AS value UNION ALL
  SELECT 'b' AS s1, 'b3' AS s2, null AS s3, null AS s4, null AS s5, 90 AS value UNION ALL
  SELECT 'c' AS s1, 'c1' AS s2, null AS s3, null AS s4, null AS s5, 19 AS value UNION ALL
  SELECT 'c' AS s1, 'c2' AS s2, 'b2' AS s3, 'a2' AS s4, 'a3' AS s5, 92 AS value UNION ALL
  SELECT 'c' AS s1, 'c3' AS s2, 'c4' AS s3, null AS s4, null AS s5, 63 AS value UNION ALL
  SELECT 'c' AS s1, 'c4' AS s2, null AS s3, null AS s4, null AS s5, 44 AS value
`;

describe("Sankey and Sunburst", () => {
  beforeEach(() => {
    cy.login();
  });

  describe("Creation through UI", () => {
    beforeEach(() => {
      cy.createQuery({ query: SQL }).then(({ id }) => {
        cy.visit(`queries/${id}/source`);
        cy.getByTestId("ExecuteButton").click();
        cy.getByTestId("NewVisualization").click();
        cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.SUNBURST_SEQUENCE");
      });
    });

    it("creates Sunburst", () => {
      const visualizationName = "Sunburst";

      cy.getByTestId("VisualizationName")
        .clear()
        .type(visualizationName);
      cy.getByTestId("VisualizationPreview")
        .find("svg")
        .should("exist");

      cy.getByTestId("EditVisualizationDialog")
        .contains("button", "Save")
        .click();
      cy.getByTestId("QueryPageVisualizationTabs")
        .contains("span", visualizationName)
        .should("exist");
    });

    it("creates Sankey", () => {
      const visualizationName = "Sankey";

      cy.getByTestId("VisualizationName")
        .clear()
        .type(visualizationName);
      cy.getByTestId("VisualizationPreview")
        .find("svg")
        .should("exist");

      cy.getByTestId("EditVisualizationDialog")
        .contains("button", "Save")
        .click();
      cy.getByTestId("QueryPageVisualizationTabs")
        .contains("span", visualizationName)
        .should("exist");
    });
  });

  const STAGES_WIDGETS = [
    { name: "1 stage", query: `SELECT s1,value FROM (${SQL}) q`, position: { autoHeight: false, sizeY: 10, sizeX: 2 } },
    {
      name: "2 stages",
      query: `SELECT s1,s2,value FROM (${SQL}) q`,
      position: { autoHeight: false, col: 2, sizeY: 10, sizeX: 2 },
    },
    {
      name: "3 stages",
      query: `SELECT s1,s2,s3,value FROM (${SQL}) q`,
      position: { autoHeight: false, col: 4, sizeY: 10, sizeX: 2 },
    },
    {
      name: "4 stages",
      query: `SELECT s1,s2,s3,s4,value FROM (${SQL}) q`,
      position: { autoHeight: false, row: 9, sizeY: 10, sizeX: 2 },
    },
    {
      name: "5 stages",
      query: `SELECT s1,s2,s3,s4,s5,value FROM (${SQL}) q`,
      position: { autoHeight: false, row: 9, col: 2, sizeY: 10, sizeX: 2 },
    },
  ];

  it("takes a snapshot with Sunburst (1 - 5 stages)", function() {
    cy.createDashboard("Sunburst Visualization").then(dashboard => {
      this.dashboardUrl = `/dashboards/${dashboard.id}`;
      return cy
        .all(
          STAGES_WIDGETS.map(sunburst => () =>
            cy
              .createQuery({ name: `Sunburst with ${sunburst.name}`, query: sunburst.query })
              .then(queryData => cy.createVisualization(queryData.id, "SUNBURST_SEQUENCE", "Sunburst", {}))
              .then(visualization => cy.addWidget(dashboard.id, visualization.id, { position: sunburst.position }))
          )
        )
        .then(widgets => {
          cy.visit(this.dashboardUrl);
          widgets.forEach(widget => {
            cy.getByTestId(getWidgetTestId(widget)).within(() => cy.get("svg").should("exist"));
          });

          // wait a bit before taking snapshot
          cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
          cy.percySnapshot("Visualizations - Sunburst");
        });
    });
  });

  it("takes a snapshot with Sankey (1 - 5 stages)", function() {
    cy.createDashboard("Sankey Visualization").then(dashboard => {
      this.dashboardUrl = `/dashboards/${dashboard.id}`;
      return cy
        .all(
          STAGES_WIDGETS.map(sankey => () =>
            cy
              .createQuery({ name: `Sankey with ${sankey.name}`, query: sankey.query })
              .then(queryData => cy.createVisualization(queryData.id, "SANKEY", "Sankey", {}))
              .then(visualization => cy.addWidget(dashboard.id, visualization.id, { position: sankey.position }))
          )
        )
        .then(widgets => {
          cy.visit(this.dashboardUrl);
          widgets.forEach(widget => {
            cy.getByTestId(getWidgetTestId(widget)).within(() => cy.get("svg").should("exist"));
          });

          // wait a bit before taking snapshot
          cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
          cy.percySnapshot("Visualizations - Sankey");
        });
    });
  });
});
