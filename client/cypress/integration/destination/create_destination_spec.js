describe("Create Destination", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/destinations/new");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("CreateSourceDialog").should("contain", "Email");
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Create Destination - Types");
  });
});
