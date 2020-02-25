import { createQuery } from "../../../support/redash-api";

describe("Query Based Dropdown Parameter", () => {
  beforeEach(() => {
    cy.login();

    const dropdownQueryData = {
      name: "Dropdown Query",
      query: `SELECT 'value1' AS name, 1 AS value UNION ALL
              SELECT 'value2' AS name, 2 AS value UNION ALL
              SELECT 'value3' AS name, 3 AS value`,
    };
    createQuery(dropdownQueryData, true).then(dropdownQuery => {
      const queryData = {
        name: "Query Based Dropdown Parameter",
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [{ name: "test-parameter", title: "Test Parameter", type: "query", queryId: dropdownQuery.id }],
        },
      };

      cy.visit(`/queries/${dropdownQuery.id}`);
      cy.getByTestId("ExecuteButton").click();
      cy.getByTestId("TableVisualization")
        .should("contain", "value1")
        .and("contain", "value2")
        .and("contain", "value3");

      createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));
    });
  });

  it("supports multi-selection", () => {
    cy.clickThrough(`
      ParameterSettings-test-parameter
      AllowMultipleValuesCheckbox
      QuotationSelect
      DoubleQuotationMarkOption
      SaveParameterSettings
    `);

    // add a little waiting before changing the parameter value
    cy.wait(200); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("ParameterName-test-parameter")
      .find(".ant-select")
      .click();

    // make sure all options are unselected and select all
    cy.get("li.ant-select-dropdown-menu-item").each($option => {
      expect($option).not.to.have.class("ant-select-dropdown-menu-item-selected");
      cy.wrap($option).click();
    });

    cy.getByTestId("QueryEditor").click(); // just to close the select menu

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", '"1","2","3"');
  });
});
