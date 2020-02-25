import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Dropdown Parameter", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Dropdown Parameter",
      query: "SELECT '{{test-parameter}}' AS parameter",
      options: {
        parameters: [
          { name: "test-parameter", title: "Test Parameter", type: "enum", enumOptions: "value1\nvalue2\nvalue3" },
        ],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));
  });

  it("updates the results after selecting a value", () => {
    cy.getByTestId("ParameterName-test-parameter")
      .find(".ant-select")
      .click();

    cy.contains("li.ant-select-dropdown-menu-item", "value2").click();

    cy.getByTestId("ParameterApplyButton").click();
    // ensure that query is being executed
    cy.getByTestId("QueryExecutionStatus").should("exist");

    cy.getByTestId("TableVisualization").should("contain", "value2");
  });

  it("supports multi-selection", () => {
    cy.clickThrough(`
        ParameterSettings-test-parameter
        AllowMultipleValuesCheckbox
        QuotationSelect
        DoubleQuotationMarkOption
        SaveParameterSettings
      `);

    cy.getByTestId("ParameterName-test-parameter")
      .find(".ant-select")
      .click();

    // select all unselected options
    cy.get("li.ant-select-dropdown-menu-item").each($option => {
      if (!$option.hasClass("ant-select-dropdown-menu-item-selected")) {
        cy.wrap($option).click();
      }
    });

    cy.getByTestId("QueryEditor").click(); // just to close the select menu

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", '"value1","value2","value3"');
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => {
      cy.getByTestId("ParameterName-test-parameter")
        .find(".ant-select")
        .click();

      cy.contains("li.ant-select-dropdown-menu-item", "value2").click();
    });
  });
});
