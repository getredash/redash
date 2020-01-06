describe("Settings", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/settings/organization");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("OrganizationSettings").within(() => {
      cy.getByTestId("DateFormatSelect").should("contain", "DD/MM/YY");
      cy.getByTestId("TimeFormatSelect").should("contain", "HH:mm");
    });

    cy.percySnapshot("Organization Settings");
  });
});
