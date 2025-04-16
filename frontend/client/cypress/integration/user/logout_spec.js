describe("Logout", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/");
  });

  it("shows login page after logout", () => {
    cy.getByTestId("ProfileDropdown").click();
    // Wait until submenu appears and become interactive
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.getByTestId("LogOutButton")
      .should("be.visible")
      .click();

    cy.title().should("eq", "Login to Redash");
  });
});
