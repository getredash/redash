import { createQuery } from "../../../support/redash-api";

describe("Query Based Dropdown Parameter", () => {
  beforeEach(() => {
    cy.login();
  });

  context("based on a query without parameters", () => {
    beforeEach(() => {
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

      cy.getByTestId("ParameterName-test-parameter")
        .find(".ant-select-selection")
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

  context("based on a query with parameters", () => {
    const openParamMapping = (paramName, executeActions) => {
      cy.getByTestId(`EditParamMappingButton-${paramName}`).click();
      if (executeActions) {
        cy.getByTestId("InputPopoverContent")
          .filter(":visible")
          .within(executeActions);
      }
    };

    beforeEach(() => {
      const dropdownQueryData = {
        name: "Dropdown Query",
        query: `SELECT * FROM (SELECT 'value1' AS name, 1 AS value UNION ALL
              SELECT 'value2' AS name, 2 AS value UNION ALL
              SELECT 'value3' AS name, 3 AS value UNION ALL
              SELECT '{{extra}}' AS name, 4 AS value) q
              WHERE name ilike '%{{search}}%'`,
        options: {
          parameters: [
            { name: "search", title: "Search Name", type: "text", value: "value" },
            { name: "extra", title: "Extra", type: "text", value: "value4" },
          ],
        },
      };
      createQuery(dropdownQueryData, true).then(dropdownQuery => {
        const queryData = {
          name: "Query Based Dropdown Parameter",
          query: "SELECT '[{{test-parameter}}]' AS parameter",
          options: {
            parameters: [{ name: "test-parameter", title: "Test Parameter", type: "query", queryId: dropdownQuery.id }],
          },
        };

        createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));
        cy.getByTestId("ParameterSettings-test-parameter").click();
        cy.getByTestId("QueryBasedParameterMappingTable")
          .should("contain", "Search Name")
          .and("contain", "Extra");

        cy.getByTestId("SaveParameterSettings").should("be.disabled");

        // map search param as Dropdown Search
        openParamMapping("search", () => {
          cy.getByTestId("DropdownSearchOption").click();
          cy.contains("button", "OK").click();
        });

        // map extra param with a Static Value
        openParamMapping("extra", () => {
          cy.getByTestId("DropdownSearchOption").should("be.disabled");
          cy.getByTestId("StaticValueOption").click();
          cy.contains("button", "OK").should("be.disabled");
          cy.getByTestId("ParameterValueInput")
            .find("input")
            .type("{selectall}FooBar");
          cy.contains("button", "OK").click();
        });

        cy.getByTestId("SaveParameterSettings").click();
      });
    });

    const selectResultOptionsAndExecute = (searchTerm, expectedResult) => {
      cy.getByTestId("ParameterName-test-parameter")
        .find(".ant-select-selection")
        .click()
        .find("input")
        .type(searchTerm, { force: true });

      // make sure results are available in options
      cy.get(".ant-select-dropdown-menu").contains(searchTerm);

      // select all options
      cy.get("li.ant-select-dropdown-menu-item").each($option => {
        cy.wrap($option).click();
      });

      cy.getByTestId("QueryEditor").click(); // just to close the select menu
      cy.getByTestId("ParameterApplyButton").click();
      cy.getByTestId("TableVisualization").should("contain", expectedResult);
    };

    it("allows the selection of search values", () => {
      selectResultOptionsAndExecute("value2", "[2]");
      selectResultOptionsAndExecute("FooBar", "[4]");
    });

    it("supports multi-selection", () => {
      cy.clickThrough(`
      ParameterSettings-test-parameter
      AllowMultipleValuesCheckbox
      QuotationSelect
      DoubleQuotationMarkOption
      SaveParameterSettings
    `);

      selectResultOptionsAndExecute("value", '["1","2","3"]');
      selectResultOptionsAndExecute("FooBar", '["4"]');
    });
  });
});
