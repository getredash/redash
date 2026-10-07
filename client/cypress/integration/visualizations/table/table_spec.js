/* global cy, Cypress */

import * as AllCellTypes from "./.mocks/all-cell-types";
import * as MultiColumnSort from "./.mocks/multi-column-sort";
import * as SearchInData from "./.mocks/search-in-data";
import * as LargeDataset from "./.mocks/large-dataset";

function prepareVisualization(query, type, name, options) {
  return cy
    .createQuery({ query })
    .then(({ id }) => cy.createVisualization(id, type, name, options))
    .then(({ id: visualizationId, query_id: queryId }) => {
      // use data-only view because we don't need editor features, but it will
      // free more space for visualizations. Also, we'll hide schema browser (via shortcut)
      cy.visit(`queries/${queryId}#${visualizationId}`);

      cy.getByTestId("ExecuteButton").click();
      cy.get("body").type("{alt}D");

      // do some pre-checks here to ensure that visualization was created and is visible
      cy.getByTestId("TableVisualization").should("exist").find("table").should("exist");

      return cy.then(() => ({ queryId, visualizationId }));
    });
}

// Checks the values displayed in each column, in row order
function expectColumns(expected) {
  cy.getByTestId("TableVisualization")
    .find("tbody tr.ant-table-row")
    .should(($rows) => {
      Cypress._.each(expected, (values, columnIndex) => {
        const actual = Cypress._.map($rows, (row) => Cypress.$(row).find("td").eq(columnIndex).text().trim());
        expect(actual).to.deep.equal(values);
      });
    });
}

describe("Table", () => {
  beforeEach(() => {
    cy.login();
  });

  it("renders all cell types", () => {
    const { query, config } = AllCellTypes;
    prepareVisualization(query, "TABLE", "All cell types", config).then(() => {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500); // add some waiting to avoid an async update error from .jvi-toggle

      // expand JSON cell
      cy.get(".jvi-item.jvi-root .jvi-toggle").click();
      cy.get(".jvi-item.jvi-root .jvi-item .jvi-toggle").click({ multiple: true });
    });
  });

  describe("Sorting data", () => {
    beforeEach(function () {
      const { query, config } = MultiColumnSort;
      prepareVisualization(query, "TABLE", "Sort data", config).then(({ queryId, visualizationId }) => {
        this.queryId = queryId;
        this.visualizationId = visualizationId;
      });
    });

    it("sorts data by a single column", function () {
      cy.getByTestId("TableVisualization").find("table th").contains("c").should("exist").click();
      expectColumns({ 2: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] });
    });

    it("sorts data by a multiple columns", function () {
      cy.getByTestId("TableVisualization").find("table th").contains("a").should("exist").click();

      cy.get("body").type("{shift}", { release: false });
      cy.getByTestId("TableVisualization").find("table th").contains("b").should("exist").click();
      expectColumns({
        0: ["1", "1", "1", "1", "2", "2", "2", "3", "3", "3"],
        1: ["1", "1", "2", "3", "1", "2", "3", "1", "2", "3"],
      });
    });

    it("sorts data in reverse order", function () {
      cy.getByTestId("TableVisualization").find("table th").contains("c").should("exist").click().click();
      expectColumns({ 2: ["j", "i", "h", "g", "f", "e", "d", "c", "b", "a"] });
    });
  });

  it("searches in multiple columns", () => {
    const { query, config } = SearchInData;
    prepareVisualization(query, "TABLE", "Search", config).then(({ visualizationId }) => {
      cy.getByTestId("TableVisualization").find("table input").should("exist").type("test");
    });
  });

  it("shows pagination and navigates to third page", () => {
    const { query, config } = LargeDataset;
    prepareVisualization(query, "TABLE", "With pagination", config).then(({ visualizationId }) => {
      cy.get(".visualization-renderer")
        .find(".ant-table-pagination")
        .should("exist")
        .find("li")
        .contains("3")
        .should("exist")
        .click();
    });
  });
});
