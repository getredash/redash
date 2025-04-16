describe("Dashboard list sort", () => {
  beforeEach(() => {
    cy.login();
  });

  it("creates one dashboard", () => {
    cy.visit("/dashboards");
    cy.getByTestId("CreateButton").click();
    cy.getByTestId("CreateDashboardMenuItem").click();
    cy.getByTestId("CreateDashboardDialog").within(() => {
      cy.get("input").type("A Foo Bar");
      cy.getByTestId("DashboardSaveButton").click();
    });
  });

  describe("Sorting table does not crash page ", () => {
    it("sorts", () => {
      cy.visit("/dashboards");
      cy.contains("Name").click();
      cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ErrorMessage").should("not.exist");
    });
  });
});
