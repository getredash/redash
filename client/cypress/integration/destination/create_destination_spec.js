describe("Create Destination", () => {
  beforeEach(() => {
    cy.login();
  });

  it("renders the page and takes a screenshot", function() {
    cy.visit("/destinations/new");
    cy.server();
    cy.route("**/api/destinations/types").as("DestinationTypesRequest");

    cy.wait("@DestinationTypesRequest")
      .then(({ response }) => response.body.filter(type => type.deprecated))
      .then(deprecatedTypes => deprecatedTypes.map(type => type.type))
      .as("deprecatedTypes");

    cy.getByTestId("PreviewItem")
      .then($previewItems => Cypress.$.map($previewItems, item => Cypress.$(item).attr("data-test-type")))
      .then(availableTypes => expect(availableTypes).not.to.contain.oneOf(this.deprecatedTypes));

    cy.getByTestId("CreateSourceDialog").should("contain", "Email");
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Create Destination - Types");
  });

  it("shows a custom error message when destination name is already taken", () => {
    cy.createDestination("Slack Destination", "slack").then(() => {
      cy.visit("/destinations/new");

      cy.getByTestId("SearchSource").type("Slack");
      cy.getByTestId("CreateSourceDialog")
        .contains("Slack")
        .click();

      cy.getByTestId("Name").type("Slack Destination");
      cy.getByTestId("CreateSourceSaveButton").click();

      cy.contains("Alert Destination with the name Slack Destination already exists.");
    });
  });
});
