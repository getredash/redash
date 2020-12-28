import { createQueryAndAddWidget } from "../../support/dashboard";

describe("Parameter Mapping", () => {
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

    if (close) {
      cy.contains("button", "OK").click();
    }
  };

  const reorderTwoParameters = (param1, param2, type = "WIDGET") => {
    cy.get(".parameter-block")
      .first()
      .invoke("width")
      .as("paramWidth");

    const dragParam = (paramName, offsetLeft, offsetTop) => {
      cy.getByTestId(`DragHandle-${paramName}`)
        .trigger("mouseover")
        .trigger("mousedown");

      cy.get(".parameter-dragged .drag-handle")
        .trigger("mousemove", offsetLeft, offsetTop, { force: true })
        .trigger("mouseup", { force: true });
    };

    cy.get("@paramWidth").then(paramWidth => {
      cy.server();
      cy.route("POST", `**/api/${type === "WIDGET" ? "widgets" : "dashboards"}/*`).as("Save");

      dragParam(param1.name, paramWidth, 1);
      cy.wait("@Save");

      cy.reload();

      const expectedOrder = [param2.title, param1.title];
      cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));

      dragParam(param2.name, paramWidth, 1);
      cy.wait("@Save");
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

    reorderTwoParameters(parameters[0], parameters[1]);
  });

  it("supports dashboard parameters", function() {
    openMappingOptions(this.widgetTestId);
    cy.getByTestId("EditParamMappingButton-param1").click();
    cy.getByTestId("NewDashboardParameterOption").click();
    saveMappingOptions(false);

    cy.getByTestId("EditParamMappingButton-param2").click();
    cy.getByTestId("NewDashboardParameterOption")
      .filter(":visible")
      .click();
    saveMappingOptions(true);

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

    reorderTwoParameters(parameters[0], parameters[1], "DASHBOARD");
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
