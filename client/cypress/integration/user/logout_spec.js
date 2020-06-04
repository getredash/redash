describe("Logout", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/");
  });

  it("shows login page after logout", () => {
    cy.getByTestId("ProfileDropdown").click();
    cy.getByTestId("LogOutButton").click();

    cy.title().should("eq", "Login to Redash");
  });
});
