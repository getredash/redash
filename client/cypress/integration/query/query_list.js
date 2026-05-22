describe("Query list sort", () => {
  beforeEach(() => {
    cy.login();
  });

  describe("Sorting table does not crash page ", () => {
    it("sorts", () => {
      cy.visit("/queries");
      cy.contains("Name").click();
      cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ErrorMessage").should("not.exist");
    });
  });

  describe("Show only unassigned queries ", () => {
    it("sorts", () => {
      cy.visit("/queries/unassigned");
      cy.contains("Name").click();
      cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ErrorMessage").should("not.exist");
    });
  });
});
