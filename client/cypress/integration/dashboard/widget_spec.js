/* global cy */

import { createDashboard, createQuery } from "../../support/redash-api";
import { createQueryAndAddWidget, editDashboard, resizeBy } from "../../support/dashboard";

describe("Widget", () => {
  beforeEach(function() {
    cy.login();
    createDashboard("Foo Bar").then(({ slug, id }) => {
      this.dashboardId = id;
      this.dashboardUrl = `/dashboard/${slug}`;
    });
  });

  const confirmDeletionInModal = () => {
    cy.get(".ant-modal .ant-btn")
      .contains("Delete")
      .click({ force: true });
  };

  it("adds widget", function() {
    createQuery().then(({ id: queryId }) => {
      cy.visit(this.dashboardUrl);
      editDashboard();
      cy.getByTestId("AddWidgetButton").click();
      cy.getByTestId("AddWidgetDialog").within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      });
      cy.contains("button", "Add to Dashboard").click();
      cy.getByTestId("AddWidgetDialog").should("not.exist");
      cy.get(".widget-wrapper").should("exist");
    });
  });

  it("removes widget", function() {
    createQueryAndAddWidget(this.dashboardId).then(elTestId => {
      cy.visit(this.dashboardUrl);
      editDashboard();
      cy.getByTestId(elTestId).within(() => {
        cy.getByTestId("WidgetDeleteButton").click();
      });

      confirmDeletionInModal();
      cy.getByTestId(elTestId).should("not.exist");
    });
  });

  describe("Auto height for table visualization", () => {
    it("renders correct height for 2 table rows", function() {
      const queryData = {
        query: "select s.a FROM generate_series(1,2) AS s(a)",
      };

      createQueryAndAddWidget(this.dashboardId, queryData).then(elTestId => {
        cy.visit(this.dashboardUrl);
        cy.getByTestId(elTestId)
          .its("0.offsetHeight")
          .should("eq", 235);
      });
    });

    it("renders correct height for 5 table rows", function() {
      const queryData = {
        query: "select s.a FROM generate_series(1,5) AS s(a)",
      };

      createQueryAndAddWidget(this.dashboardId, queryData).then(elTestId => {
        cy.visit(this.dashboardUrl);
        cy.getByTestId(elTestId)
          .its("0.offsetHeight")
          .should("eq", 335);
      });
    });

    describe("Height behavior on refresh", () => {
      const paramName = "count";
      const queryData = {
        query: `select s.a FROM generate_series(1,{{ ${paramName} }}) AS s(a)`,
        options: {
          parameters: [
            {
              title: paramName,
              name: paramName,
              type: "text",
            },
          ],
        },
      };

      beforeEach(function() {
        createQueryAndAddWidget(this.dashboardId, queryData).then(elTestId => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId)
            .as("widget")
            .within(() => {
              cy.getByTestId("RefreshButton").as("refreshButton");
            });
          cy.getByTestId(`ParameterName-${paramName}`).within(() => {
            cy.getByTestId("TextParamInput").as("paramInput");
          });
        });
      });

      it("grows when dynamically adding table rows", () => {
        // listen to results
        cy.server();
        cy.route("GET", "api/query_results/*").as("FreshResults");

        // start with 1 table row
        cy.get("@paramInput")
          .clear()
          .type("1");
        cy.getByTestId("ParameterApplyButton").click();
        cy.wait("@FreshResults", { timeout: 10000 });
        cy.get("@widget")
          .invoke("height")
          .should("eq", 285);

        // add 4 table rows
        cy.get("@paramInput")
          .clear()
          .type("5");
        cy.getByTestId("ParameterApplyButton").click();
        cy.wait("@FreshResults", { timeout: 10000 });

        // expect to height to grow by 1 grid grow
        cy.get("@widget")
          .invoke("height")
          .should("eq", 435);
      });

      it("revokes auto height after manual height adjustment", () => {
        // listen to results
        cy.server();
        cy.route("GET", "api/query_results/*").as("FreshResults");

        editDashboard();

        // start with 1 table row
        cy.get("@paramInput")
          .clear()
          .type("1");
        cy.getByTestId("ParameterApplyButton").click();
        cy.wait("@FreshResults");
        cy.get("@widget")
          .invoke("height")
          .should("eq", 285);

        // resize height by 1 grid row
        resizeBy(cy.get("@widget"), 0, 50)
          .then(() => cy.get("@widget"))
          .invoke("height")
          .should("eq", 335); // resized by 50, , 135 -> 185

        // add 4 table rows
        cy.get("@paramInput")
          .clear()
          .type("5");
        cy.getByTestId("ParameterApplyButton").click();
        cy.wait("@FreshResults");

        // expect height to stay unchanged (would have been 435)
        cy.get("@widget")
          .invoke("height")
          .should("eq", 335);
      });
    });
  });

  it("sets the correct height of table visualization", function() {
    const queryData = {
      query: `select '${"loremipsum".repeat(15)}' FROM generate_series(1,15)`,
    };

    const widgetOptions = { position: { col: 0, row: 0, sizeX: 3, sizeY: 10, autoHeight: false } };

    createQueryAndAddWidget(this.dashboardId, queryData, widgetOptions).then(() => {
      cy.visit(this.dashboardUrl);
      cy.getByTestId("TableVisualization")
        .its("0.offsetHeight")
        .should("eq", 381);
      cy.percySnapshot("Shows correct height of table visualization");
    });
  });

  it("shows fixed pagination for overflowing tabular content ", function() {
    const queryData = {
      query: "select 'lorem ipsum' FROM generate_series(1,50)",
    };

    const widgetOptions = { position: { col: 0, row: 0, sizeX: 3, sizeY: 10, autoHeight: false } };

    createQueryAndAddWidget(this.dashboardId, queryData, widgetOptions).then(() => {
      cy.visit(this.dashboardUrl);
      cy.getByTestId("TableVisualization")
        .next(".ant-pagination.mini")
        .should("be.visible");
      cy.percySnapshot("Shows fixed mini pagination for overflowing tabular content");
    });
  });
});
