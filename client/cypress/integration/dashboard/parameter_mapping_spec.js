import { createDashboard } from "../../support/redash-api";
import { createQueryAndAddWidget } from "../../support/dashboard";

describe("Parameter Mapping", () => {
  beforeEach(function() {
    cy.login();
    createDashboard("Foo Bar")
      .then(({ slug, id }) => {
        this.dashboardId = id;
        this.dashboardUrl = `/dashboard/${slug}`;
      })
      .then(() => {
        const queryData = {
          name: "Text Parameter",
          query: "SELECT '{{test-parameter}}' AS parameter",
          options: {
            parameters: [{ name: "test-parameter", title: "Test Parameter", type: "text", value: "example" }],
          },
        };
        const widgetOptions = { position: { col: 0, row: 0, sizeX: 3, sizeY: 10, autoHeight: false } };
        createQueryAndAddWidget(this.dashboardId, queryData, widgetOptions).then(widgetTestId => {
          cy.visit(this.dashboardUrl);
          this.widgetTestId = widgetTestId;
        });
      });
  });

  const openMappingOptions = (widgetTestId, paramName) => {
    cy.getByTestId(widgetTestId).within(() => {
      cy.getByTestId("WidgetDropdownButton").click();
    });

    cy.getByTestId("WidgetDropdownButtonMenu")
      .contains("Edit Parameters")
      .click();

    cy.getByTestId(`EditParamMappingButon-${paramName}`).click();
  };

  const saveMappingOptions = () => {
    cy.getByTestId("EditParamMappingPopover").within(() => {
      cy.contains("button", "OK").click();
    });

    cy.contains("button", "OK").click();
  };

  it("supports widget parameters", function() {
    // widget parameter mapping is the default for the API
    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "example");

      cy.getByTestId("ParameterName-test-parameter")
        .find("input")
        .type("{selectall}Redash");

      cy.getByTestId("ParameterApplyButton").click();

      cy.getByTestId("TableVisualization").should("contain", "Redash");
    });

    cy.getByTestId("DashboardParameters").should("not.exist");
  });

  it("supports dashboard parameters", function() {
    openMappingOptions(this.widgetTestId, "test-parameter");

    cy.getByTestId("NewDashboardParameterOption").click();

    saveMappingOptions();

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("ParameterName-test-parameter").should("not.exist");
    });

    cy.getByTestId("DashboardParameters").within(() => {
      cy.getByTestId("ParameterName-test-parameter")
        .find("input")
        .type("{selectall}DashboardParam");

      cy.getByTestId("ParameterApplyButton").click();
    });

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "DashboardParam");
    });
  });

  it("supports static values for parameters", function() {
    openMappingOptions(this.widgetTestId, "test-parameter");

    cy.getByTestId("StaticValueOption").click();

    cy.getByTestId("EditParamMappingPopover").within(() => {
      cy.getByTestId("ParameterValueInput")
        .find("input")
        .type("{selectall}StaticValue");
    });

    saveMappingOptions();

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("ParameterName-test-parameter").should("not.exist");
    });

    cy.getByTestId("DashboardParameters").should("not.exist");

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "StaticValue");
    });
  });
});
