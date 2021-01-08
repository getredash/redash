import { each } from "lodash";
import { createQueryAndAddWidget, editDashboard } from "../../support/dashboard";
import { dragParam, expectParamOrder } from "../../support/parameters";

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

  const saveMappingOptions = (close = true) => {
    cy.getByTestId("EditParamMappingPopover")
      .filter(":visible")
      .within(() => {
        cy.contains("button", "OK").click();
      });

    cy.getByTestId("EditParamMappingPopover").should("not.be.visible");

    if (close) {
      cy.contains("button", "OK").click();
    }
  };

  const setWidgetParametersToDashboard = parameters => {
    each(parameters, ({ name: paramName }, i) => {
      cy.getByTestId(`EditParamMappingButton-${paramName}`).click();
      cy.getByTestId("NewDashboardParameterOption")
        .filter(":visible")
        .click();
      saveMappingOptions(i === parameters.length - 1);
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

  it("supports dashboard parameters", function() {
    openMappingOptions(this.widgetTestId);
    setWidgetParametersToDashboard(parameters);

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("ParameterName-param1").should("not.exist");
    });

    cy.getByTestId("DashboardParameters").within(() => {
      cy.getByTestId("ParameterName-param1")
        .find("input")
        .type("{selectall}DashboardParam");

      cy.getByTestId("ParameterApplyButton").click();
    });

    cy.getByTestId(this.widgetTestId).within(() => {
      cy.getByTestId("TableVisualization").should("contain", "DashboardParam");
    });
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

  it("reorders parameters", function() {
    // Reorder is only available in edit mode
    editDashboard();

    const [param1, param2] = parameters;

    cy.getByTestId("ParameterBlock-param1")
      .invoke("width")
      .then(paramWidth => {
        cy.server();
        cy.route("POST", `**/api/dashboards/*`).as("SaveDashboard");
        cy.route("POST", `**/api/widgets/*`).as("SaveWidget");

        // Asserts widget param order
        dragParam(param1.name, paramWidth, 1);
        cy.wait("@SaveWidget");
        cy.reload();
        expectParamOrder([param2.title, param1.title]);

        // Asserts dashboard param order
        openMappingOptions(this.widgetTestId);
        setWidgetParametersToDashboard(parameters);
        cy.wait("@SaveWidget");
        dragParam(param1.name, paramWidth, 1);
        cy.wait("@SaveDashboard");
        cy.reload();
        expectParamOrder([param2.title, param1.title]);
      });
  });
});
