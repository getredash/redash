/* global cy, Cypress */

/*
  This test suite relies on Percy (does not validate rendered visualizations)
*/

import * as AllCellTypes from "./.mocks/all-cell-types";
import * as MultiColumnSort from "./.mocks/multi-column-sort";
import * as SearchInData from "./.mocks/search-in-data";
import * as LargeDataset from "./.mocks/large-dataset";
import * as WideDataSet from "./.mocks/wide-dataset";

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
      cy.getByTestId("TableVisualization")
        .should("exist")
        .find("table")
        .should("exist");

      return cy.then(() => ({ queryId, visualizationId }));
    });
}

describe("Table", () => {
  const viewportWidth = Cypress.config("viewportWidth");

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

      cy.percySnapshot("Visualizations - Table (All cell types)", { widths: [viewportWidth] });
    });
  });

  describe("Sorting data", () => {
    beforeEach(function() {
      const { query, config } = MultiColumnSort;
      prepareVisualization(query, "TABLE", "Sort data", config).then(({ queryId, visualizationId }) => {
        this.queryId = queryId;
        this.visualizationId = visualizationId;
      });
    });

    it("sorts data by a single column", function() {
      cy.getByTestId("TableVisualization")
        .find("table th")
        .contains("c")
        .should("exist")
        .click();
      cy.percySnapshot("Visualizations - Table (Single-column sort)", { widths: [viewportWidth] });
    });

    it("sorts data by a multiple columns", function() {
      cy.getByTestId("TableVisualization")
        .find("table th")
        .contains("a")
        .should("exist")
        .click();

      cy.get("body").type("{shift}", { release: false });
      cy.getByTestId("TableVisualization")
        .find("table th")
        .contains("b")
        .should("exist")
        .click();

      cy.percySnapshot("Visualizations - Table (Multi-column sort)", { widths: [viewportWidth] });
    });

    it("sorts data in reverse order", function() {
      cy.getByTestId("TableVisualization")
        .find("table th")
        .contains("c")
        .should("exist")
        .click()
        .click();
      cy.percySnapshot("Visualizations - Table (Single-column reverse sort)", { widths: [viewportWidth] });
    });
  });

  describe("Fixing columns", () => {
    it("fixes the correct number of columns", () => {
      const { query, config } = WideDataSet;
      prepareVisualization(query, "TABLE", "All cell types", config);
      cy.getByTestId("EditVisualization").click();
      cy.contains("span", "Grid").click();
      cy.getByTestId("FixedColumns").click();
      cy.contains(".ant-select-item-option-content", "1").click();
      cy.contains("Save").click();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500); //add some waiting to make sure table visualization is saved

      cy.get(".ant-table-thead")
        .find("th.ant-table-cell-fix-left")
        .then(fixedCols => {
          expect(fixedCols.length).to.equal(1);
        });

      cy.get(".ant-table-content").scrollTo("right", { duration: 1000 });
      cy.get(".ant-table-content").scrollTo("left", { duration: 1000 });
    });

    it("doesn't let user fix too many columns", () => {
      const { query, config } = MultiColumnSort;
      prepareVisualization(query, "TABLE", "Test data", config);
      cy.getByTestId("EditVisualization").click();
      cy.contains("span", "Grid").click();
      cy.getByTestId("FixedColumns").click();
      cy.get(".ant-select-item-option-content");
      cy.contains(".ant-select-item-option-content", "3").should("not.exist");
      cy.contains(".ant-select-item-option-content", "4").should("not.exist");
    });

    it("doesn't cause issues when freezing column off of page", () => {
      const { query, config } = WideDataSet;
      prepareVisualization(query, "TABLE", "Test data", config);
      cy.getByTestId("EditVisualization").click();
      cy.contains("span", "Grid").click();
      cy.getByTestId("FixedColumns").click();
      cy.contains(".ant-select-item-option-content", "4").click();
      cy.contains("Save").click();
    });
  });

  it("searches in multiple columns", () => {
    const { query, config } = SearchInData;
    prepareVisualization(query, "TABLE", "Search", config).then(({ visualizationId }) => {
      cy.getByTestId("TableVisualization")
        .find("table input")
        .should("exist")
        .type("test");
      cy.percySnapshot("Visualizations - Table (Search in data)", { widths: [viewportWidth] });
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

      cy.percySnapshot("Visualizations - Table (Pagination)", { widths: [viewportWidth] });
    });
  });
});
