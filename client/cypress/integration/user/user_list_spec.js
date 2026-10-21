describe("User List", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/users");
  });

  it("renders the page", () => {
    cy.getByTestId("UserList").should("exist").and("contain", "Example Admin");
  });
});
