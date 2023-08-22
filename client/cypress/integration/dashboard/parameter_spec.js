import { createQueryAndAddWidget } from "../../support/dashboard";

describe("Dashboard Parameters", () => {
  const parameters = [
    { name: "param1", title: "Parameter 1", type: "text", value: "example1" },
    { name: "param2", title: "Parameter 2", type: "text", value: "example2" },
  ];

  beforeEach(function() {
    cy.login();
    cy.createDashboard("Foo Bar")
      .then(({ id }) => {
        this.dashboardId = id;
        this.dashboardUrl = `/dashboards/${id}`;
      })
      .then(() => {
        const queryData = {
          name: "Text Parameter",
          query: "SELECT '{{param1}}', '{{param2}}' AS parameter",
          options: {
            parameters,
          },
        };
        const widgetOptions = { position: { col: 0, row: 0, sizeX: 3, sizeY: 10, autoHeight: false } };
        createQueryAndAddWidget(this.dashboardId, queryData, widgetOptions).then(widgetTestId => {
          cy.visit(this.dashboardUrl);
          this.widgetTestId = widgetTestId;
        });
      });
  });

  const openMappingOptions = widgetTestId => {
    cy.getByTestId(widgetTestId).within(() => {
      cy.getByTestId("WidgetDropdownButton").click();
    });

    cy.getByTestId("WidgetDropdownButtonMenu")
      .contains("Edit Parameters")
      .click();
  };

  const saveMappingOptions = (closeMappingMenu = false) => {
    return cy
      .getByTestId("EditParamMappingPopover")
      .filter(":visible")
      .as("Popover")
      .within(() => {
        // This is needed to grant the element will have finished loading
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.contains("button", "OK").click();
      })
      .then(() => {
        if (closeMappingMenu) {
          cy.contains("button", "OK").click();
        }
        return cy.get("@Popover").should("not.be.visible");
      });
  };

  it("supports widget parameters", function() {
    // widget parameter mapping is the default for the API
    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "example1");

      cy.getByTestId("ParameterName-param1")
        .find("input")
        .type("{selectall}Redash");

      cy.getByTestId("ParameterApplyButton").click();

      cy.getByTestId("TableVisualization").should("contain", "Redash");
    });

    cy.getByTestId("DashboardParameters").should("not.exist");
  });

  it("supports static values for parameters", function() {
    openMappingOptions(this.widgetTestId);
    cy.getByTestId("EditParamMappingButton-param1").click();

    cy.getByTestId("StaticValueOption").click();

    cy.getByTestId("EditParamMappingPopover").within(() => {
      cy.getByTestId("ParameterValueInput")
        .find("input")
        .type("{selectall}StaticValue");
    });

    saveMappingOptions(true);

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("ParameterName-param1").should("not.exist");
    });

    cy.getByTestId("DashboardParameters").should("not.exist");

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "StaticValue");
    });
  });
});
