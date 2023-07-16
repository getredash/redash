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

describe("Query Filters", () => {
  beforeEach(() => {
    cy.login();
  });

  describe("Simple Filter", () => {
    beforeEach(() => {
      const queryData = {
        name: "Query Filters",
        query: `SELECT stage1 AS "stage1::filter", stage2, value FROM (${SQL}) q`,
      };

      cy.createQuery(queryData).then(({ id }) => cy.visit(`/queries/${id}`));
      cy.getByTestId("ExecuteButton").click();
    });

    it("filters rows in a Table Visualization", () => {
      cy.getByTestId("FilterName-stage1::filter")
        .find(".ant-select-selection-item")
        .should("have.text", "a");

      expectTableToHaveLength(4);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a"]);

      cy.getByTestId("FilterName-stage1::filter")
        .find(".ant-select")
        .click();

      cy.contains(".ant-select-item-option-content", "b").click();

      expectTableToHaveLength(3);
      expectFirstColumnToHaveMembers(["b", "b", "b"]);
    });
  });

  describe("Multi Filter", () => {
    beforeEach(() => {
      const queryData = {
        name: "Query Filters",
        query: `SELECT stage1 AS "stage1::multi-filter", stage2, value FROM (${SQL}) q`,
      };

      cy.createQuery(queryData).then(({ id }) => cy.visit(`/queries/${id}`));
      cy.getByTestId("ExecuteButton").click();
    });

    function expectSelectedOptionsToHaveMembers(values) {
      cy.getByTestId("FilterName-stage1::multi-filter")
        .find(".ant-select-selection-item-content")
        .then($selectedOptions => Cypress.$.map($selectedOptions, item => Cypress.$(item).text()))
        .then(selectedOptions => expect(selectedOptions).to.have.members(values));
    }

    it("filters rows in a Table Visualization", () => {
      // Defaults to All Options Selected

      expectSelectedOptionsToHaveMembers(["a", "b", "c"]);
      expectTableToHaveLength(11);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a", "b", "b", "b", "c", "c", "c", "c"]);

      // Clear Option

      cy.getByTestId("FilterName-stage1::multi-filter")
        .find(".ant-select-selector")
        .click();
      cy.getByTestId("ClearOption").click();
      cy.getByTestId("FilterName-stage1::multi-filter").click(); // close dropdown

      cy.getByTestId("TableVisualization").should("not.exist");

      // Single Option selected

      cy.getByTestId("FilterName-stage1::multi-filter")
        .find(".ant-select-selector")
        .click();
      cy.contains(".ant-select-item-option-grouped > .ant-select-item-option-content", "a").click();
      cy.getByTestId("FilterName-stage1::multi-filter").click(); // close dropdown

      expectSelectedOptionsToHaveMembers(["a"]);
      expectTableToHaveLength(4);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a"]);

      // Two Options selected

      cy.getByTestId("FilterName-stage1::multi-filter")
        .find(".ant-select-selector")
        .click();
      cy.contains(".ant-select-item-option-content", "b").click();
      cy.getByTestId("FilterName-stage1::multi-filter").click(); // close dropdown

      expectSelectedOptionsToHaveMembers(["a", "b"]);
      expectTableToHaveLength(7);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a", "b", "b", "b"]);

      // Select All Option

      cy.getByTestId("FilterName-stage1::multi-filter")
        .find(".ant-select-selector")
        .click();
      cy.getByTestId("SelectAllOption").click();
      cy.getByTestId("FilterName-stage1::multi-filter").click(); // close dropdown

      expectSelectedOptionsToHaveMembers(["a", "b", "c"]);
      expectTableToHaveLength(11);
      expectFirstColumnToHaveMembers(["a", "a", "a", "a", "b", "b", "b", "c", "c", "c", "c"]);
    });
  });
});
