describe("User List", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/users");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("UserList")
      .should("exist")
      .and("contain", "Example Admin");

    cy.percySnapshot("Users");
  });
});
