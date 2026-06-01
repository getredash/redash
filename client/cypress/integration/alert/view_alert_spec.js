describe("View Alert", () => {
  function visitAlertWithErrorCapture(url) {
    cy.visit(url, {
      onBeforeLoad(win) {
        win.__capturedErrors = [];
        win.handleException = (error) => {
          win.__capturedErrors.push({
            message: error?.message,
            stack: error?.stack,
          });
        };
      },
    });
  }

  function getDestinationItem(destinationName) {
    return cy.getByTestId("AlertDestinations").contains("li.destination-wrapper", destinationName);
  }

  function expectNonAuthorCannotRemoveDestination(destinationName) {
    cy.window().its("__capturedErrors").should("deep.equal", []);
    cy.getByTestId("ErrorMessage").should("not.exist");
    cy.getByTestId("Criteria").should("exist");
    cy.getByTestId("AlertDestinations").should("contain", destinationName);
    getDestinationItem(destinationName).within(() => {
      cy.get(".remove-button").should("not.exist");
    });
  }

  beforeEach(function () {
    cy.login().then(() => {
      cy.createQuery({ query: "select 1 as col_name" })
        .then(({ id: queryId }) => cy.createAlert(queryId, { column: "col_name" }))
        .then(({ id: alertId }) => {
          this.alertId = alertId;
          this.alertUrl = `/alerts/${alertId}`;
        });
    });
  });

  it("renders the page and takes a screenshot", function () {
    cy.visit(this.alertUrl);
    cy.getByTestId("Criteria").should("exist");
    cy.percySnapshot("View Alert screen");
  });

  it("allows adding new destinations", function () {
    cy.intercept("GET", "**/api/destinations").as("Destinations");
    cy.intercept("GET", "**/api/alerts/*/subscriptions").as("Subscriptions");

    cy.visit(this.alertUrl);
    cy.getByTestId("AlertDestinations").contains("Test Email Destination").should("not.exist");

    cy.wait(["@Destinations", "@Subscriptions"]);
    cy.getByTestId("ShowAddAlertSubDialog").click();
    cy.contains("Test Email Destination").click();
    cy.contains("Save").click();

    cy.getByTestId("AlertDestinations").contains("Test Email Destination").should("exist");
  });

  describe("Alert Destination permissions", () => {
    before(() => {
      cy.login();
      cy.createUser({
        name: "Example User",
        email: "user@redash.io",
        password: "password",
      });
    });

    it("hides remove button from non-author", function () {
      cy.logout()
        .then(() => cy.login()) // as admin
        .then(() => cy.addDestinationSubscription(this.alertId, "Test Email Destination"))
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button appears for author
          getDestinationItem("Test Email Destination").within(() => {
            cy.get(".remove-button").should("exist");
          });

          return cy.logout().then(() => cy.login("user@redash.io", "password"));
        })
        .then(() => {
          visitAlertWithErrorCapture(this.alertUrl);
          expectNonAuthorCannotRemoveDestination("Test Email Destination");
        });
    });

    it("shows remove button for non-author admin", function () {
      cy.logout()
        .then(() => cy.login("user@redash.io", "password"))
        .then(() => cy.addDestinationSubscription(this.alertId, "Test Email Destination"))
        .then(() => cy.logout().then(() => cy.login())) // as admin
        .then(() => {
          cy.visit(this.alertUrl);

          // verify remove button also appears for admin
          getDestinationItem("Test Email Destination").within(() => {
            cy.get(".remove-button").should("exist");
          });
        });
    });
  });
});
