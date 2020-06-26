import { createAlert, createQuery, createUser, addDestinationSubscription } from "../../support/redash-api";

describe("View Alert", () => {
  beforeEach(function() {
    cy.login();
    createQuery({ query: "select 1 as col_name" })
      .then(({ id: queryId }) => createAlert(queryId, { column: "col_name" }))
      .then(({ id: alertId }) => {
        this.alertId = alertId;
        this.alertUrl = `/alerts/${alertId}`;
      });
  });

  it("renders the page and takes a screenshot", function() {
    cy.visit(this.alertUrl);
    cy.getByTestId("Criteria").should("exist");
    cy.percySnapshot("View Alert screen");
  });

  it("allows adding new destinations", function() {
    cy.visit(this.alertUrl);
    cy.getByTestId("AlertDestinations")
      .contains("Test Email Destination")
      .should("not.exist");

    cy.server();
    cy.route("GET", "api/destinations").as("Destinations");
    cy.route("GET", "api/alerts/*/subscriptions").as("Subscriptions");

    cy.visit(this.alertUrl);

    cy.wait(["@Destinations", "@Subscriptions"]);
    cy.getByTestId("ShowAddAlertSubDialog").click();
    cy.contains("Test Email Destination").click();
    cy.contains("Save").click();

    cy.getByTestId("AlertDestinations")
      .contains("Test Email Destination")
      .should("exist");
  });

  describe("Alert Destination permissions", () => {
    before(() => {
      cy.login();
      createUser({
        name: "Example User",
        email: "user@redash.io",
        password: "password",
      });
    });

    it("hides remove button from non-author", function() {
      cy.server();
      cy.route("GET", "api/alerts/*/subscriptions").as("Subscriptions");

      cy.logout()
        .then(() => cy.login()) // as admin
        .then(() => addDestinationSubscription(this.alertId, "Test Email Destination"))
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button appears for author
          cy.wait(["@Subscriptions"]);
          cy.getByTestId("AlertDestinations")
            .contains("Test Email Destination")
            .parent()
            .within(() => {
              cy.get(".remove-button")
                .as("RemoveButton")
                .should("exist");
            });

          return cy.logout().then(() => cy.login("user@redash.io", "password"));
        })
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button not shown for non-author
          cy.wait(["@Subscriptions"]);
          cy.get("@RemoveButton").should("not.exist");
        });
    });

    it("shows remove button for non-author admin", function() {
      cy.server();
      cy.route("GET", "api/alerts/*/subscriptions").as("Subscriptions");

      cy.logout()
        .then(() => cy.login("user@redash.io", "password"))
        .then(() => addDestinationSubscription(this.alertId, "Test Email Destination"))
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button appears for author
          cy.wait(["@Subscriptions"]);
          cy.getByTestId("AlertDestinations")
            .contains("Test Email Destination")
            .parent()
            .within(() => {
              cy.get(".remove-button")
                .as("RemoveButton")
                .should("exist");
            });

          return cy.logout().then(() => cy.login()); // as admin
        })
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button also appears for admin
          cy.wait(["@Subscriptions"]);
          cy.get("@RemoveButton").should("exist");
        });
    });
  });
});
