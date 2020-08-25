import { createQueryAndAddWidget, editDashboard } from "../../support/dashboard";
import { expectTableToHaveLength, expectFirstColumnToHaveMembers } from "../../support/visualizations/table";

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

describe("Dashboard Filters", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Query Filters",
      query: `SELECT stage1 AS "stage1::filter", stage2, value FROM (${SQL}) q`,
    };
    cy.createDashboard("Dashboard Filters").then(dashboard => {
      createQueryAndAddWidget(dashboard.id, queryData)
        .as("widget1TestId")
        .then(() => createQueryAndAddWidget(dashboard.id, queryData, { position: { col: 4 } }))
        .as("widget2TestId")
        .then(() => cy.visit(`/dashboards/${dashboard.id}`));
    });
  });

  it("filters rows in a Table Visualization", function() {
    editDashboard();
    cy.getByTestId("DashboardFilters").should("not.exist");
    cy.getByTestId("DashboardFiltersCheckbox").click();

    cy.getByTestId("DashboardFilters").within(() => {
      cy.getByTestId("FilterName-stage1::filter")
        .find(".ant-select-selection-item")
        .should("have.text", "a");
    });

    cy.getByTestId(this.widget1TestId).within(() => {
      expectTableToHaveLength(4);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a"]);

      cy.getByTestId("FilterName-stage1::filter")
        .find(".ant-select")
        .click();
    });

    cy.contains(".ant-select-item-option-content:visible", "b").click();

    cy.getByTestId(this.widget1TestId).within(() => {
      expectTableToHaveLength(3);
      expectFirstColumnToHaveMembers(["b", "b", "b"]);
    });

    // assert that changing one widget filter doesn't affect another

    cy.getByTestId(this.widget2TestId).within(() => {
      expectTableToHaveLength(4);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a"]);
    });

    // assert that changing a global filter affects all widgets

    cy.getByTestId("DashboardFilters").within(() => {
      cy.getByTestId("FilterName-stage1::filter")
        .find(".ant-select")
        .click();
    });

    cy.contains(".ant-select-item-option-content:visible", "c").click();

    [this.widget1TestId, this.widget2TestId].forEach(widgetTestId =>
      cy.getByTestId(widgetTestId).within(() => {
        expectTableToHaveLength(4);
        expectFirstColumnToHaveMembers(["c", "c", "c", "c"]);
      })
    );
  });
});
