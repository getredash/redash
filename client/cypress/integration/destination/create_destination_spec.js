describe("Create Destination", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/destinations/new");
  });

  it("renders the page and takes a screenshot", function() {
    cy.server();
    cy.route("api/destinations/types").as("DestinationTypesRequest");

    cy.wait("@DestinationTypesRequest")
      .then(({ response }) => response.body.filter(type => type.deprecated))
      .then(deprecatedTypes => deprecatedTypes.map(type => type.type))
      .as("deprecatedTypes");

    cy.getByTestId("PreviewItem")
      .then($previewItems => Cypress.$.map($previewItems, item => Cypress.$(item).attr("data-test-type")))
      .then(availableTypes => expect(availableTypes).not.to.contain.members(this.deprecatedTypes));

    cy.getByTestId("CreateSourceDialog").should("contain", "Email");
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Create Destination - Types");
  });
});
