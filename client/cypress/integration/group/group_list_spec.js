describe("Group List", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/groups");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("GroupList")
      .should("exist")
      .and("contain", "admin")
      .and("contain", "default");

    cy.percySnapshot("Groups");
  });
});
