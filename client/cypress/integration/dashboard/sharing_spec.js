/* global cy */

import { createDashboard, createQuery } from "../../support/redash-api";
import { editDashboard, shareDashboard, createQueryAndAddWidget } from "../../support/dashboard";

describe("Dashboard Sharing", () => {
  beforeEach(function() {
    cy.login();
    createDashboard("Foo Bar").then(({ slug, id }) => {
      this.dashboardId = id;
      this.dashboardUrl = `/dashboard/${slug}`;
    });
  });

  it("is possible if all queries are safe", function() {
    const options = {
      parameters: [
        {
          name: "foo",
          type: "number",
        },
      ],
    };

    const dashboardUrl = this.dashboardUrl;
    createQuery({ options }).then(({ id: queryId }) => {
      cy.visit(dashboardUrl);
      editDashboard();
      cy.getByTestId("AddWidgetButton").click();
      cy.getByTestId("AddWidgetDialog").within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      });
      cy.contains("button", "Add to Dashboard").click();
      cy.getByTestId("AddWidgetDialog").should("not.exist");
      cy.clickThrough(
        {
          button: `
        Done Editing
        Publish
      `,
        },
        `OpenShareForm
      PublicAccessEnabled`
      );

      cy.getByTestId("SecretAddress").should("exist");
    });
  });

  describe("is available to unauthenticated users", () => {
    it("when there are no parameters", function() {
      const queryData = {
        query: "select 1",
      };

      const position = { autoHeight: false, sizeY: 6 };
      createQueryAndAddWidget(this.dashboardId, queryData, { position }).then(() => {
        cy.visit(this.dashboardUrl);

        shareDashboard().then(secretAddress => {
          cy.logout();
          cy.visit(secretAddress);
          cy.getByTestId("TableVisualization", { timeout: 10000 }).should("exist");
          cy.percySnapshot("Successfully Shared Unparameterized Dashboard");
        });
      });
    });

    it("when there are only safe parameters", function() {
      const queryData = {
        query: "select '{{foo}}'",
        options: {
          parameters: [
            {
              name: "foo",
              type: "number",
              value: 1,
            },
          ],
        },
      };

      const position = { autoHeight: false, sizeY: 6 };
      createQueryAndAddWidget(this.dashboardId, queryData, { position }).then(() => {
        cy.visit(this.dashboardUrl);

        shareDashboard().then(secretAddress => {
          cy.logout();
          cy.visit(secretAddress);
          cy.getByTestId("TableVisualization", { timeout: 10000 }).should("exist");
          cy.percySnapshot("Successfully Shared Parameterized Dashboard");
        });
      });
    });

    it("even when there are suddenly some unsafe parameters", function() {
      const queryData = {
        query: "select 1",
      };

      // start out by creating a dashboard with no parameters & share it
      const position = { autoHeight: false, sizeY: 6 };
      createQueryAndAddWidget(this.dashboardId, queryData, { position })
        .then(() => {
          cy.visit(this.dashboardUrl);
          return shareDashboard();
        })
        .then(secretAddress => {
          const unsafeQueryData = {
            query: "select '{{foo}}'",
            options: {
              parameters: [
                {
                  name: "foo",
                  type: "text",
                  value: "oh snap!",
                },
              ],
            },
          };

          // then, after it is shared, add an unsafe parameterized query to it
          const secondWidgetPos = { autoHeight: false, col: 3, sizeY: 6 };
          createQueryAndAddWidget(this.dashboardId, unsafeQueryData, { position: secondWidgetPos }).then(() => {
            cy.logout();
            cy.title().should("eq", "Login to Redash"); // Make sure it's logged out
            cy.visit(secretAddress);
            cy.getByTestId("TableVisualization", { timeout: 10000 }).should("exist");
            cy.contains(
              ".alert",
              "This query contains potentially unsafe parameters" +
                " and cannot be executed on a shared dashboard or an embedded visualization."
            );
            cy.percySnapshot("Successfully Shared Parameterized Dashboard With Some Unsafe Queries");
          });
        });
    });
  });

  it("is not possible if some queries are not safe", function() {
    const options = {
      parameters: [
        {
          name: "foo",
          type: "text",
        },
      ],
    };

    const dashboardUrl = this.dashboardUrl;
    createQuery({ options }).then(({ id: queryId }) => {
      cy.visit(dashboardUrl);
      editDashboard();
      cy.getByTestId("AddWidgetButton").click();
      cy.getByTestId("AddWidgetDialog").within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      });
      cy.contains("button", "Add to Dashboard").click();
      cy.getByTestId("AddWidgetDialog").should("not.exist");
      cy.clickThrough(
        {
          button: `
        Done Editing
        Publish
      `,
        },
        "OpenShareForm"
      );

      cy.getByTestId("PublicAccessEnabled").should("be.disabled");
    });
  });
});
